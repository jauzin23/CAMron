"use strict";

const express = require("express");
const http = require("http");

const db = require("../db/connection");
const { verifyBearer } = require("../middleware/auth");

const router = express.Router();

const STREAM_PORT = process.env.TEST_STREAM_PORT
  ? parseInt(process.env.TEST_STREAM_PORT)
  : 81;

const activeStreams = {};

function cleanupStream(camId) {
  const streamInfo = activeStreams[camId];
  if (!streamInfo) return;

  console.log(`[stream] Cleaning up stream for camera: ${camId}`);
  if (streamInfo.camReq) {
    try {
      streamInfo.camReq.destroy();
    } catch (e) {
      console.error(
        `[stream] Error destroying camera request for ${camId}:`,
        e.message,
      );
    }
  }

  for (const clientRes of streamInfo.clients) {
    try {
      if (!clientRes.writableEnded) {
        clientRes.end();
      }
    } catch (e) {
      console.error(`[stream] Error closing client for ${camId}:`, e.message);
    }
  }
  delete activeStreams[camId];
}

// ── GET /stream ───────────────────────────────────────────────────────────────
// Proxies the MJPEG stream from the camera (multiplexed).
// Reads camera IP from DB. Bearer required.
router.get("/", (req, res) => {
  if (!verifyBearer(req, res)) return;

  // Try ?id= param, or fall back to first camera in DB
  let cam;
  if (req.query.id) {
    cam = db.prepare("SELECT * FROM cameras WHERE id = ?").get(req.query.id);
  } else {
    cam = db
      .prepare("SELECT * FROM cameras ORDER BY created_at ASC LIMIT 1")
      .get();
  }

  if (!cam || !cam.ip) {
    return res.status(503).json({
      error: "No camera registered yet. Wait for camera to boot and handshake.",
    });
  }

  const camId = cam.id;

  // If an active stream exists for this camera, join it
  if (activeStreams[camId]) {
    const streamInfo = activeStreams[camId];
    streamInfo.clients.add(res);
    console.log(
      `[stream] Client added to existing stream for camera ${camId}. Active clients: ${streamInfo.clients.size}`,
    );

    if (streamInfo.headers) {
      res.writeHead(streamInfo.statusCode || 200, streamInfo.headers);
    }

    req.on("close", () => {
      console.log(`[stream] Client disconnected from camera stream ${camId}`);
      if (activeStreams[camId]) {
        activeStreams[camId].clients.delete(res);
        console.log(
          `[stream] Active clients for camera ${camId}: ${activeStreams[camId].clients.size}`,
        );
        if (activeStreams[camId].clients.size === 0) {
          cleanupStream(camId);
        }
      }
    });
    return;
  }

  console.log(
    `[stream] Creating new stream connection for ${camId} at ${cam.ip}:${STREAM_PORT}`,
  );
  const streamInfo = {
    camReq: null,
    camRes: null,
    statusCode: null,
    headers: null,
    clients: new Set([res]),
  };
  activeStreams[camId] = streamInfo;

  const options = {
    hostname: cam.ip,
    port: STREAM_PORT,
    path: "/stream",
    method: "GET",
    headers: {
      Authorization: `Bearer ${cam.api_key}`,
    },
    timeout: 5000,
  };

  const camReq = http.request(options, (camRes) => {
    streamInfo.camRes = camRes;
    streamInfo.statusCode = camRes.statusCode;
    streamInfo.headers = camRes.headers;

    console.log(
      `[stream] Camera connection established for ${camId} - status ${camRes.statusCode}`,
    );

    for (const clientRes of streamInfo.clients) {
      if (!clientRes.headersSent) {
        clientRes.writeHead(camRes.statusCode, camRes.headers);
      }
    }

    camRes.on("data", (chunk) => {
      for (const clientRes of streamInfo.clients) {
        try {
          clientRes.write(chunk);
        } catch (err) {
          console.error(
            `[stream] Error writing to client for ${camId}:`,
            err.message,
          );
        }
      }
    });

    camRes.on("end", () => {
      console.log(`[stream] Camera stream ended by camera for ${camId}`);
      cleanupStream(camId);
    });

    camRes.on("error", (err) => {
      console.error(`[stream] Camera stream error for ${camId}:`, err.message);
      cleanupStream(camId);
    });
  });

  camReq.on("timeout", () => {
    console.error(`[stream] Camera request timed out for ${camId}`);
    for (const clientRes of streamInfo.clients) {
      if (!clientRes.headersSent) {
        clientRes.status(504).json({ error: "Camera timed out" });
      }
    }
    cleanupStream(camId);
  });

  camReq.on("error", (err) => {
    console.error(`[stream] Camera request error for ${camId}:`, err.message);
    for (const clientRes of streamInfo.clients) {
      if (!clientRes.headersSent) {
        clientRes
          .status(502)
          .json({ error: "Could not reach camera: " + err.message });
      }
    }
    cleanupStream(camId);
  });

  streamInfo.camReq = camReq;
  camReq.end();

  req.on("close", () => {
    console.log(`[stream] Client disconnected from camera stream ${camId}`);
    if (activeStreams[camId]) {
      activeStreams[camId].clients.delete(res);
      console.log(
        `[stream] Active clients for camera ${camId}: ${activeStreams[camId].clients.size}`,
      );
      if (activeStreams[camId].clients.size === 0) {
        cleanupStream(camId);
      }
    }
  });
});

// ── GET /viewer ───────────────────────────────────────────────────────────────
// Minimal HTML viewer served from backend. LAN-only diagnostic tool.
router.get("/viewer", (req, res) => {
  const CAMERA_BEARER_TOKEN = process.env.CAMERA_BEARER_TOKEN;
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
      background: #111;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      font-family: system-ui, sans-serif;
      color: #eee;
    }
    #status { margin-bottom: 12px; font-size: 14px; color: #aaa; }
    #stream { max-width: 100%; border: 1px solid #333; border-radius: 4px; }
  </style>
</head>
<body>
  <p id="status">Connecting…</p>
  <img id="stream" alt="Camera stream" />

  <script>
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

        statusEl.textContent = "Live";

        const reader = resp.body.getReader();
        let buffer   = new Uint8Array(0);
        const SOI    = [0xFF, 0xD8];
        const EOI    = [0xFF, 0xD9];

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
            if (eoiIdx === -1) continue;

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

module.exports = router;
