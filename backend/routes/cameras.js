"use strict";

const express = require("express");
const crypto = require("crypto");
const net = require("net");
const http = require("http");

const db = require("../db/connection");
const cameraEmitter = require("../utils/emitter");

const router = express.Router();

function generateApiKey() {
  return crypto.randomBytes(32).toString("hex");
}

function now() {
  return new Date().toISOString();
}

function pingCamera(ip, port = 81, timeout = 2000) {
  return new Promise((resolve) => {
    if (!ip) return resolve(false);
    const socket = new net.Socket();
    let status = false;

    socket.setTimeout(timeout);

    socket.on("connect", () => {
      status = true;
      socket.destroy();
    });

    socket.on("timeout", () => {
      socket.destroy();
    });

    socket.on("error", () => {
      socket.destroy();
    });

    socket.on("close", () => {
      resolve(status);
    });

    socket.connect(port, ip);
  });
}

if (process.env.NODE_ENV !== "test") {
  setInterval(async () => {
    try {
      const cameras = db.prepare("SELECT id, ip, last_seen, flash_active FROM cameras WHERE ip IS NOT NULL AND ip != ''").all();
      let changed = false;
      await Promise.all(
        cameras.map(async (c) => {
          const isOnline = await pingCamera(c.ip, 81, 2000);
          if (isOnline) {
            db.prepare("UPDATE cameras SET last_seen = ? WHERE id = ?").run(now(), c.id);
            changed = true;
          } else {
            const wasActive = c.flash_active === 1;
            let wasOnline = false;
            if (c.last_seen) {
              const diff = (Date.now() - new Date(c.last_seen).getTime()) / 1000;
              if (diff < 10) wasOnline = true;
            }
            if (wasActive || wasOnline) {
              db.prepare("UPDATE cameras SET flash_active = 0 WHERE id = ?").run(c.id);
              changed = true;
            }
          }
        })
      );
      if (changed) {
        cameraEmitter.emit("change");
      }
    } catch (err) {
      console.error("[cameras background ping] Error:", err.message);
    }
  }, 5000);
}

router.get("/", (req, res) => {
  try {
    const cameras = db
      .prepare("SELECT * FROM cameras ORDER BY created_at DESC")
      .all();

    const result = cameras.map((c) => ({
      ...c,
      flash_active: c.flash_active === 1,
    }));

    res.json(result);
  } catch (err) {
    console.error("[cameras] GET /:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", (req, res) => {
  const { name } = req.body;
  if (!name || typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ error: "Missing required field: name" });
  }

  const id = crypto.randomUUID();
  const api_key = generateApiKey();
  const ts = now();

  try {
    db.prepare(
      `INSERT INTO cameras (id, api_key, name, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)`,
    ).run(id, api_key, name.trim(), ts, ts);

    const camera = db.prepare("SELECT * FROM cameras WHERE id = ?").get(id);
    cameraEmitter.emit("change");
    res.status(201).json({
      ...camera,
      flash_active: camera.flash_active === 1,
    });
  } catch (err) {
    console.error("[cameras] POST /:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/events", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const sendCameras = () => {
    try {
      const cameras = db
        .prepare("SELECT * FROM cameras ORDER BY created_at DESC")
        .all();
      const result = cameras.map((c) => ({
        ...c,
        flash_active: c.flash_active === 1,
      }));
      res.write(`data: ${JSON.stringify(result)}\n\n`);
    } catch (err) {
      console.error("[cameras SSE] Error fetching cameras:", err.message);
    }
  };

  sendCameras();

  const onChange = () => {
    sendCameras();
  };

  cameraEmitter.on("change", onChange);

  const heartbeat = setInterval(() => {
    res.write(":\n\n");
  }, 15000);

  req.on("close", () => {
    clearInterval(heartbeat);
    cameraEmitter.off("change", onChange);
    res.end();
  });
});

router.get("/:id", (req, res) => {
  try {
    const camera = db
      .prepare("SELECT * FROM cameras WHERE id = ?")
      .get(req.params.id);
    if (!camera) return res.status(404).json({ error: "Camera not found" });
    res.json({ ...camera, flash_active: camera.flash_active === 1 });
  } catch (err) {
    console.error("[cameras] GET /:id:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/:id", (req, res) => {
  const { name } = req.body;
  if (!name || typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ error: "Missing required field: name" });
  }

  try {
    const camera = db
      .prepare("SELECT id FROM cameras WHERE id = ?")
      .get(req.params.id);
    if (!camera) return res.status(404).json({ error: "Camera not found" });

    db.prepare("UPDATE cameras SET name = ?, updated_at = ? WHERE id = ?").run(
      name.trim(),
      now(),
      req.params.id,
    );

    const updated = db
      .prepare("SELECT * FROM cameras WHERE id = ?")
      .get(req.params.id);
    cameraEmitter.emit("change");
    res.json({ ...updated, flash_active: updated.flash_active === 1 });
  } catch (err) {
    console.error("[cameras] PUT /:id:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", (req, res) => {
  try {
    const camera = db
      .prepare("SELECT id FROM cameras WHERE id = ?")
      .get(req.params.id);
    if (!camera) return res.status(404).json({ error: "Camera not found" });

    db.prepare("DELETE FROM cameras WHERE id = ?").run(req.params.id);
    cameraEmitter.emit("change");
    res.status(204).send();
  } catch (err) {
    console.error("[cameras] DELETE /:id:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/register", (req, res) => {
  const { id, ip } = req.body;
  if (!id || !ip) {
    return res.status(400).json({ error: "Missing id or ip in body" });
  }

  const authHeader = req.headers["authorization"] || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  try {
    const camera = db.prepare("SELECT id, api_key FROM cameras WHERE id = ?").get(id);
    if (!camera) {
      return res
        .status(404)
        .json({ error: `No camera with id '${id}' found in DB` });
    }

    if (!token || token !== camera.api_key) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    db.prepare(
      "UPDATE cameras SET ip = ?, last_seen = ?, updated_at = ?, flash_active = 0 WHERE id = ?",
    ).run(ip, now(), now(), id);

    try {
      db.prepare(
        "INSERT INTO flash_history (camera_id, success) VALUES (?, 1)",
      ).run(id);
    } catch (e) {
      console.error("[cameras] Failed to insert flash history on register:", e.message);
    }

    console.log(`[cameras] ESP32 register: id=${id} ip=${ip}`);
    cameraEmitter.emit("change");
    res.json({ ok: true, message: `Camera '${id}' registered at ${ip}` });
  } catch (err) {
    console.error("[cameras] POST /register:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/:id/flash", (req, res) => {
  const { id } = req.params;
  try {
    const camera = db.prepare("SELECT * FROM cameras WHERE id = ?").get(id);
    if (!camera) return res.status(404).json({ error: "Camera not found" });
    if (!camera.ip) {
      return res.status(400).json({ error: "The camera has not registered its IP yet." });
    }

    const active = camera.flash_active === 1 ? 0 : 1;
    const value = active === 1 ? 100 : 0;
    const postData = JSON.stringify({ value });

    const options = {
      hostname: camera.ip,
      port: 80,
      path: "/flash",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${camera.api_key}`,
        "Content-Length": Buffer.byteLength(postData),
        "Connection": "close",
      },
      timeout: 3000,
    };

    const camReq = http.request(options, (camRes) => {
      let data = "";
      camRes.on("data", (chunk) => {
        data += chunk;
      });
      camRes.on("end", () => {
        if (camRes.statusCode === 200) {
          db.prepare(
            "UPDATE cameras SET flash_active = ?, updated_at = ? WHERE id = ?",
          ).run(active, now(), id);
          cameraEmitter.emit("change");
          res.json({ ok: true, flash_active: active === 1 });
        } else {
          res
            .status(camRes.statusCode)
            .json({ error: `The camera responded with status: ${camRes.statusCode}` });
        }
      });
    });

    camReq.on("error", (err) => {
      if (!res.headersSent) {
        res
          .status(502)
          .json({ error: `Could not connect to the camera: ${err.message}` });
      }
    });

    camReq.on("timeout", () => {
      camReq.destroy();
      if (!res.headersSent) {
        res.status(504).json({ error: "Connection to the camera timed out." });
      }
    });

    camReq.write(postData);
    camReq.end();
  } catch (err) {
    console.error("[cameras] POST /:id/flash:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
