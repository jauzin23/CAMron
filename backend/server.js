// =============================================================
// CAMron — Backend Server
// Routes:
//   POST /api/camera/register  ← camera handshake (bearer required)
//   GET  /stream               ← MJPEG proxy to camera (bearer required)
//   GET  /viewer               ← Simple HTML viewer (public, LAN-only)
//   GET  /health               ← Uptime check
// =============================================================

"use strict";

require("dotenv").config();

const express = require("express");
const http    = require("http");  // built-in, no npm install needed
const cors    = require("cors");

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Config ───────────────────────────────────────────────────
const CAMERA_BEARER_TOKEN = process.env.CAMERA_BEARER_TOKEN;
if (!CAMERA_BEARER_TOKEN || CAMERA_BEARER_TOKEN === "REPLACE_WITH_YOUR_SECRET_TOKEN") {
  console.error("ERROR: CAMERA_BEARER_TOKEN is not set in .env -- refusing to start.");
  process.exit(1);
}

// In-memory camera registry  { id → { ip, registeredAt } }
const cameras = {};
const STREAM_PORT = 81; // must match STREAM_PORT in config.h

// ── Middleware ───────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Auth helper ──────────────────────────────────────────────
function verifyBearer(req, res) {
  const authHeader = req.headers["authorization"] || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token || token !== CAMERA_BEARER_TOKEN) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

// ── POST /api/camera/register ────────────────────────────────
// Called by the camera on boot (and periodically) to announce its IP.
app.post("/api/camera/register", (req, res) => {
  if (!verifyBearer(req, res)) return;

  const { id, ip } = req.body;
  if (!id || !ip) {
    return res.status(400).json({ error: "Missing id or ip in body" });
  }

  cameras[id] = { ip, registeredAt: new Date().toISOString() };
  console.log(`Camera registered: id=${id} ip=${ip}`);
  res.json({ ok: true, message: `Camera '${id}' registered at ${ip}` });
});

// ── GET /stream ───────────────────────────────────────────────
// Proxies the MJPEG stream from the camera.
// Requires: Authorization: Bearer <token>
app.get("/stream", (req, res) => {
  if (!verifyBearer(req, res)) return;

  // For now we use a single camera.  Later: support ?id=cam2 etc.
  const camId = req.query.id || Object.keys(cameras)[0];
  if (!camId || !cameras[camId]) {
    return res.status(503).json({
      error: "No camera registered yet. Wait for camera to boot and handshake.",
    });
  }

  const cam = cameras[camId];
  console.log(`Proxying stream from ${cam.ip}:${STREAM_PORT}`);

  const options = {
    hostname: cam.ip,
    port:     STREAM_PORT,
    path:     "/stream",
    method:   "GET",
    headers: {
      Authorization: `Bearer ${CAMERA_BEARER_TOKEN}`,
    },
    // Low timeout — if camera is gone, fail fast
    timeout: 5000,
  };

  const camReq = http.request(options, (camRes) => {
    // Pass the camera's headers straight through so the browser
    // gets the correct multipart MIME type and boundaries.
    res.writeHead(camRes.statusCode, camRes.headers);
    camRes.pipe(res);

    camRes.on("error", (err) => {
      console.error("Camera stream error:", err.message);
      res.end();
    });
  });

  camReq.on("timeout", () => {
    console.error(`Camera ${cam.ip} timed out`);
    camReq.destroy();
    if (!res.headersSent) {
      res.status(504).json({ error: "Camera timed out" });
    }
  });

  camReq.on("error", (err) => {
    console.error("Camera request error:", err.message);
    if (!res.headersSent) {
      res.status(502).json({ error: "Could not reach camera: " + err.message });
    }
  });

  // If the client disconnects (closed browser tab), kill the camera request too
  req.on("close", () => {
    console.log("Client disconnected — closing camera stream");
    camReq.destroy();
  });

  camReq.end();
});

// ── GET /viewer ───────────────────────────────────────────────
// Minimal HTML viewer served from the backend.
// Uses fetch() + createObjectURL so the browser can send the
// Authorization header (which plain <img> tags cannot do).
app.get("/viewer", (req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>CAMron Live Viewer</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #fff;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      font-family: system-ui, sans-serif;
    }
    #status {
      margin-bottom: 12px;
      font-size: 14px;
      color: #555;
    }
    #stream {
      max-width: 100%;
      border: 1px solid #ddd;
    }
  </style>
</head>
<body>
  <p id="status">Connecting…</p>
  <img id="stream" alt="Camera stream" />

  <script>
    // The token is embedded here because this page is only served on LAN.
    // For production, replace this with a proper session/auth flow.
    const TOKEN = "${CAMERA_BEARER_TOKEN}";

    async function startStream() {
      const statusEl = document.getElementById("status");
      const imgEl    = document.getElementById("stream");

      try {
        const resp = await fetch("/stream", {
          headers: { Authorization: "Bearer " + TOKEN },
        });

        if (!resp.ok) {
          const body = await resp.text();
          statusEl.textContent = "Error " + resp.status + ": " + body;
          return;
        }

        // Pipe the MJPEG response through a ReadableStream reader,
        // accumulating JPEG frames and updating the <img> src.
        statusEl.textContent = "Live";

        const reader = resp.body.getReader();
        let buffer   = new Uint8Array(0);
        const SOI    = [0xFF, 0xD8]; // JPEG Start of Image
        const EOI    = [0xFF, 0xD9]; // JPEG End of Image

        function append(a, b) {
          const c = new Uint8Array(a.length + b.length);
          c.set(a); c.set(b, a.length);
          return c;
        }

        function findSeq(arr, seq, from = 0) {
          outer: for (let i = from; i <= arr.length - seq.length; i++) {
            for (let j = 0; j < seq.length; j++) {
              if (arr[i + j] !== seq[j]) continue outer;
            }
            return i;
          }
          return -1;
        }

        async function pump() {
          while (true) {
            const { done, value } = await reader.read();
            if (done) { statusEl.textContent = "Stream ended"; break; }

            buffer = append(buffer, value);

            let soiIdx = findSeq(buffer, SOI);
            if (soiIdx === -1) { buffer = new Uint8Array(0); continue; }

            let eoiIdx = findSeq(buffer, EOI, soiIdx + 2);
            if (eoiIdx === -1) continue; // wait for more data

            // Extract the JPEG frame
            const frame = buffer.slice(soiIdx, eoiIdx + 2);
            buffer      = buffer.slice(eoiIdx + 2);

            const blob = new Blob([frame], { type: "image/jpeg" });
            const url  = URL.createObjectURL(blob);
            const prev = imgEl.src;
            imgEl.src  = url;
            if (prev.startsWith("blob:")) URL.revokeObjectURL(prev);
          }
        }

        pump().catch(err => {
          statusEl.textContent = "Stream error: " + err.message;
        });

      } catch (err) {
        document.getElementById("status").textContent = "Fetch failed: " + err.message;
      }
    }

    startStream();
  </script>
</body>
</html>`);
});

// ── GET /api/cameras ─────────────────────────────────────────
// Debug: list registered cameras (bearer required)
app.get("/api/cameras", (req, res) => {
  if (!verifyBearer(req, res)) return;
  res.json(cameras);
});

// ── GET /health ───────────────────────────────────────────────
app.get("/health", (_req, res) => res.status(200).json({ ok: true }));

// ── Start ─────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\nCAMron backend listening on http://localhost:${PORT}`);
  console.log(`   Viewer   -> http://localhost:${PORT}/viewer`);
  console.log(`   Stream   -> http://localhost:${PORT}/stream  (bearer required)`);
  console.log(`   Register -> POST http://localhost:${PORT}/api/camera/register`);
  console.log(`   Token    -> ${CAMERA_BEARER_TOKEN.slice(0, 6)}...[redacted]\n`);
});
