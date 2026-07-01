"use strict";

const express = require("express");
const http = require("http");

const db = require("../db/connection");

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

/**
 * @swagger
 * /stream:
 *   get:
 *     summary: Proxies the camera video stream
 *     tags: [Stream]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: id
 *         required: false
 *         schema:
 *           type: string
 *         description: Camera ID (optional, defaults to first camera)
 *     responses:
 *       200:
 *         description: Video stream (MJPEG)
 *         content:
 *           multipart/x-mixed-replace:
 *             schema:
 *               type: string
 *               format: binary
 *       503:
 *         description: No cameras registered
 */
// GET /stream
// Proxies the MJPEG stream from the camera (multiplexed).
// Reads camera IP from DB. JWT session required (enforced by server.js).
router.get("/", (req, res) => {

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


module.exports = router;
