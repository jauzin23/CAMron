"use strict";

const express = require("express");
const crypto = require("crypto");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

const db = require("../db/connection");
const router = express.Router();

const ARDUINO_CLI_PATH = process.env.ARDUINO_CLI_PATH || "C:\\Users\\jaamj\\AppData\\Local\\Programs\\Arduino IDE\\resources\\app\\lib\\backend\\resources\\arduino-cli.exe";

// In-memory store for compiler states and confirmations
const compilations = {};
const confirmations = {};

// Helper: Auto-detect local LAN IP address
function getLocalIp() {
  const interfaces = os.networkInterfaces();
  let fallbackIp = "127.0.0.1";
  
  for (const name of Object.keys(interfaces)) {
    const lowerName = name.toLowerCase();
    // Skip virtual interfaces commonly used by VMs or VPNs
    if (
      lowerName.includes("virtual") || 
      lowerName.includes("vbox") || 
      lowerName.includes("vmware") || 
      lowerName.includes("zerotier") || 
      lowerName.includes("radmin")
    ) {
      continue;
    }
    
    for (const net of interfaces[name]) {
      if (net.family === "IPv4" && !net.internal) {
        const ip = net.address;
        // Skip VPN address spaces
        if (ip.startsWith("26.") || ip.startsWith("25.")) {
          continue;
        }
        // Prioritize standard local networks
        if (ip.startsWith("192.168.") || ip.startsWith("10.") || ip.startsWith("172.")) {
          return ip;
        }
        fallbackIp = ip;
      }
    }
  }
  return fallbackIp;
}

const DETECTED_IP = process.env.HOST_IP || getLocalIp();

// Ensure the temp directory exists
const tempDirRoot = path.join(__dirname, "..", "temp");
if (!fs.existsSync(tempDirRoot)) {
  fs.mkdirSync(tempDirRoot, { recursive: true });
}

// GET /api/network-info
router.get("/network-info", (req, res) => {
  // Use PUBLIC_PORT if set (e.g., public gateway port in Docker), fallback to internal PORT
  res.json({ ip: DETECTED_IP, port: process.env.PUBLIC_PORT || process.env.PORT || 3000 });
});

// POST /api/compile/initiate
router.post("/compile/initiate", (req, res) => {
  const { wifi_ssid, wifi_password, custom_host, custom_port, cameraId, name } = req.body;

  if (!wifi_ssid || !wifi_password) {
    return res.status(400).json({ error: "WiFi SSID e Palavra-passe são obrigatórios." });
  }

  let finalCameraId = cameraId;
  let finalApiKey = null;
  let finalName = name || "ESP32-CAM";

  try {
    if (finalCameraId) {
      // Existing camera: fetch and update WiFi settings
      const camera = db.prepare("SELECT * FROM cameras WHERE id = ?").get(finalCameraId);
      if (!camera) {
        return res.status(404).json({ error: "Câmara não encontrada na base de dados." });
      }
      finalApiKey = camera.api_key;
      finalName = camera.name;
      
      db.prepare(
        "UPDATE cameras SET wifi_ssid = ?, wifi_pass = ?, updated_at = datetime('now') WHERE id = ?"
      ).run(wifi_ssid, wifi_password, finalCameraId);
      console.log(`[compiler] Re-flash iniciado para câmara existente: ${finalName} (${finalCameraId})`);
    } else {
      // New camera: generate credentials and insert to DB
      finalCameraId = crypto.randomUUID();
      finalApiKey = crypto.randomBytes(32).toString("hex");
      
      db.prepare(
        `INSERT INTO cameras (id, api_key, name, wifi_ssid, wifi_pass, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
      ).run(finalCameraId, finalApiKey, finalName, wifi_ssid, wifi_password);
      console.log(`[compiler] Criado registo na DB para nova câmara: ${finalName} (${finalCameraId})`);
    }

    const host = custom_host || DETECTED_IP;
    const portToUse = custom_port || process.env.PORT || 3000;

    compilations[finalCameraId] = {
      ssid: wifi_ssid,
      password: wifi_password,
      host: host,
      port: portToUse,
      apiKey: finalApiKey,
      status: "pending",
      logs: "",
      timestamp: new Date()
    };

    res.json({ cameraId: finalCameraId });
  } catch (dbErr) {
    console.error("[compiler] Erro de base de dados no initiate:", dbErr.message);
    res.status(500).json({ error: "Falha ao gravar câmara na base de dados." });
  }
});

// GET /api/compile/stream/:cameraId
router.get("/compile/stream/:cameraId", (req, res) => {
  const { cameraId } = req.params;
  const compilation = compilations[cameraId];

  if (!compilation) {
    return res.status(404).json({ error: "Tarefa de compilação não encontrada." });
  }

  // Set headers for Server-Sent Events (SSE)
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  // Keep-alive heartbeat
  const heartbeat = setInterval(() => {
    res.write(":\n\n");
  }, 15000);

  compilation.status = "compiling";

  const targetDir = path.join(tempDirRoot, `temp_${cameraId}`);
  const templateDir = path.join(__dirname, "..", "template");

  // 1. Copy template folder to temp folder
  try {
    if (fs.existsSync(targetDir)) {
      fs.rmSync(targetDir, { recursive: true, force: true });
    }
    fs.mkdirSync(targetDir, { recursive: true });
    
    const copyRecursive = (src, dest) => {
      fs.mkdirSync(dest, { recursive: true });
      const entries = fs.readdirSync(src, { withFileTypes: true });
      for (let entry of entries) {
        let srcPath = path.join(src, entry.name);
        let destPath = path.join(dest, entry.name);
        if (entry.isDirectory()) {
          copyRecursive(srcPath, destPath);
        } else {
          fs.copyFileSync(srcPath, destPath);
        }
      }
    };
    
    copyRecursive(templateDir, targetDir);
    res.write(`data: [SYSTEM] Ficheiros do template copiados com sucesso.\n\n`);
  } catch (err) {
    console.error("[compiler] Erro ao copiar template:", err);
    res.write(`data: [ERROR] Falha ao configurar ambiente temporário: ${err.message}\n\n`);
    compilation.status = "failed";
    clearInterval(heartbeat);
    res.end();
    return;
  }

  // 2. Write custom config.h with filled values
  try {
    const configPath = path.join(targetDir, "camron_template", "config.h");
    let configContent = fs.readFileSync(configPath, "utf8");

    configContent = configContent
      .replace("TEMPLATE_WIFI_SSID", compilation.ssid)
      .replace("TEMPLATE_WIFI_PASSWORD", compilation.password)
      .replace("TEMPLATE_BACKEND_HOST", compilation.host)
      .replace("TEMPLATE_BACKEND_PORT", compilation.port.toString())
      .replace("TEMPLATE_CAMERA_BEARER_TOKEN", compilation.apiKey)
      .replace("TEMPLATE_CAMERA_ID", cameraId);

    fs.writeFileSync(configPath, configContent, "utf8");
    res.write(`data: [SYSTEM] Configurações de Wi-Fi e rede gravadas no ficheiro config.h.\n\n`);
  } catch (err) {
    console.error("[compiler] Erro ao escrever config.h:", err);
    res.write(`data: [ERROR] Falha ao configurar ficheiro config.h: ${err.message}\n\n`);
    compilation.status = "failed";
    clearInterval(heartbeat);
    res.end();
    return;
  }

  // 3. Spawn Arduino CLI process
  res.write(`data: compiling\n\n`);
  console.log(`[compiler] A iniciar arduino-cli compile em: ${targetDir}`);

  const sketchDir = path.join(targetDir, "camron_template");
  const arduinoProcess = spawn(ARDUINO_CLI_PATH, [
    "compile",
    "--fqbn",
    "esp32:esp32:esp32cam",
    "--board-options",
    "PartitionScheme=huge_app,FlashMode=dio,FlashFreq=80",
    "--output-dir",
    targetDir,
    sketchDir
  ]);

  arduinoProcess.stdout.on("data", (data) => {
    compilation.logs += data.toString();
  });

  arduinoProcess.stderr.on("data", (data) => {
    compilation.logs += "[STDERR] " + data.toString();
  });

  arduinoProcess.on("close", (code) => {
    clearInterval(heartbeat);
    if (code === 0) {
      // Copy and rename compiled files to root directory
      try {
        const filesToMap = [
          { srcName: "camron_template.ino.bin", destName: "firmware.bin" },
          { srcName: "camron_template.ino.bootloader.bin", destName: "bootloader.bin" },
          { srcName: "camron_template.ino.partitions.bin", destName: "partitions.bin" }
        ];

        for (const mapping of filesToMap) {
          const src = path.join(targetDir, mapping.srcName);
          const dest = path.join(targetDir, mapping.destName);
          if (fs.existsSync(src)) {
            fs.copyFileSync(src, dest);
            console.log(`[compiler] Copiado ${mapping.srcName} para ${dest}`);
          } else {
            console.error(`[compiler] Ficheiro compilado em falta: ${src}`);
          }
        }

        // Also copy boot_app0.bin to targetDir root
        const bootAppSrc = path.join(targetDir, "camron_template", "boot_app0.bin");
        const bootAppDest = path.join(targetDir, "boot_app0.bin");
        if (fs.existsSync(bootAppSrc)) {
          fs.copyFileSync(bootAppSrc, bootAppDest);
          console.log(`[compiler] Copiado boot_app0.bin para ${bootAppDest}`);
        }
      } catch (copyErr) {
        console.error("[compiler] Erro ao preparar binários compilados:", copyErr);
      }

      compilation.status = "success";
      res.write(`event: complete\ndata: ${JSON.stringify({ cameraId, apiKey: compilation.apiKey })}\n\n`);
    } else {
      compilation.status = "failed";
      console.error(`[compiler] Compilação falhou com código de saída ${code}. Logs:\n${compilation.logs}`);
      res.write(`event: error\ndata: A compilação falhou.\n\n`);
    }
    res.end();
  });
});

// GET /api/download/:cameraId/:filename
router.get("/download/:cameraId/:filename", (req, res) => {
  const { cameraId, filename } = req.params;
  const compilation = compilations[cameraId];

  // We check memory store or DB
  let hasRecord = !!compilation;
  if (!hasRecord) {
    const camera = db.prepare("SELECT id FROM cameras WHERE id = ?").get(cameraId);
    if (camera) hasRecord = true;
  }

  if (!hasRecord) {
    return res.status(404).json({ error: "Tarefa de gravação não encontrada." });
  }

  const targetDir = path.join(tempDirRoot, `temp_${cameraId}`);
  const filePath = path.join(targetDir, filename);

  if (fs.existsSync(filePath)) {
    res.download(filePath, filename);
  } else {
    res.status(404).json({ error: `Ficheiro ${filename} não encontrado. Certifique-se que a compilação correu com sucesso.` });
  }
});

// POST /api/confirm-flash
// Called by the ESP32 on its first boot to report success
router.post("/confirm-flash", (req, res) => {
  const { id, status, message } = req.body;
  const authHeader = req.headers["authorization"] || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!id) {
    return res.status(400).json({ error: "Câmara sem ID" });
  }

  let finalApiKey = null;
  const compilation = compilations[id];
  if (compilation) {
    finalApiKey = compilation.apiKey;
  } else {
    const camera = db.prepare("SELECT api_key FROM cameras WHERE id = ?").get(id);
    if (camera) {
      finalApiKey = camera.api_key;
    }
  }

  if (!finalApiKey) {
    return res.status(404).json({ error: "Câmara não registada ou em falta." });
  }

  if (!token || token !== finalApiKey) {
    return res.status(401).json({ error: "Token de autorização inválido" });
  }

  confirmations[id] = {
    status: status || "success",
    message: message || "Configuração efetuada com sucesso!",
    timestamp: new Date()
  };

  try {
    // Record flash success in history
    db.prepare("INSERT INTO flash_history (camera_id, success) VALUES (?, 1)").run(id);
    
    // Also update camera seen details
    db.prepare("UPDATE cameras SET last_seen = datetime('now'), updated_at = datetime('now') WHERE id = ?").run(id);

    console.log(`[handshake] Câmara ${id} confirmou primeiro arranque: ${message}`);
    res.json({ ok: true, message: "Confirmação registada." });
  } catch (err) {
    console.error("[handshake] Erro ao registar confirmação na DB:", err.message);
    res.status(500).json({ error: "Erro interno ao processar confirmação" });
  }
});

// GET /api/confirm-status/:cameraId
router.get("/confirm-status/:cameraId", (req, res) => {
  const { cameraId } = req.params;
  const confirmation = confirmations[cameraId];

  if (confirmation) {
    return res.json({ confirmed: true, status: confirmation.status, message: confirmation.message });
  }

  // Fallback: Check if the camera has registered with the backend since compile/flash was initiated
  const compilation = compilations[cameraId];
  if (compilation) {
    try {
      const camera = db.prepare("SELECT last_seen FROM cameras WHERE id = ?").get(cameraId);
      if (camera && camera.last_seen) {
        const lastSeenDate = new Date(camera.last_seen);
        const compileDate = new Date(compilation.timestamp);
        
        // If the registration happened after we initiated compile/flash, or was very recent (last 15s)
        if (lastSeenDate >= compileDate || (new Date() - lastSeenDate) < 15000) {
          return res.json({ 
            confirmed: true, 
            status: "success", 
            message: "Câmara online (registada via handshake regular)!" 
          });
        }
      }
    } catch (err) {
      console.error("[confirm-status] Erro ao verificar base de dados:", err.message);
    }
  }

  res.json({ confirmed: false });
});

// Cleanup Endpoint
router.post("/cleanup/:cameraId", (req, res) => {
  const { cameraId } = req.params;
  const targetDir = path.join(tempDirRoot, `temp_${cameraId}`);
  try {
    if (fs.existsSync(targetDir)) {
      fs.rmSync(targetDir, { recursive: true, force: true });
      console.log(`[compiler] Limpeza efetuada da pasta temporária da câmara: ${cameraId}`);
    }
    res.json({ success: true });
  } catch (err) {
    console.error(`[compiler] Falha ao limpar pasta da câmara ${cameraId}:`, err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
