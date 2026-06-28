"use strict";

const express = require("express");
const crypto = require("crypto");
const { v4: uuidv4 } = require("uuid");
const net = require("net");

const db = require("../db/connection");
const { verifyBearer } = require("../middleware/auth");

const router = express.Router();

// ── Helpers ──────────────────────────────────────────────────────────────────

function generateApiKey() {
  return crypto.randomBytes(32).toString("hex");
}

function now() {
  return new Date().toISOString();
}

/**
 * Pings a camera's stream port (TCP 81) to see if it's reachable.
 * Returns true if connection succeeds, false on timeout/error.
 */
function pingCamera(ip, port = 81, timeout = 300) {
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

// ── GET /api/cameras ─────────────────────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const cameras = db
      .prepare("SELECT * FROM cameras ORDER BY created_at DESC")
      .all();

    // Ping all cameras in parallel to determine live online status
    const pingPromises = cameras.map(async (c) => {
      const isOnline = await pingCamera(c.ip, 81, 300);
      const ts = isOnline ? now() : null;

      // Update the DB last_seen status dynamically
      db.prepare("UPDATE cameras SET last_seen = ? WHERE id = ?").run(ts, c.id);

      return {
        ...c,
        last_seen: ts,
        flash_active: c.flash_active === 1,
      };
    });

    const result = await Promise.all(pingPromises);
    res.json(result);
  } catch (err) {
    console.error("[cameras] GET /:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── POST /api/cameras ────────────────────────────────────────────────────────
router.post("/", (req, res) => {
  const { name } = req.body;
  if (!name || typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ error: "Missing required field: name" });
  }

  const id = uuidv4();
  const api_key = generateApiKey();
  const ts = now();

  try {
    db.prepare(
      `INSERT INTO cameras (id, api_key, name, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)`,
    ).run(id, api_key, name.trim(), ts, ts);

    const camera = db.prepare("SELECT * FROM cameras WHERE id = ?").get(id);
    res.status(201).json({
      ...camera,
      flash_active: camera.flash_active === 1,
    });
  } catch (err) {
    console.error("[cameras] POST /:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── GET /api/cameras/:id ──────────────────────────────────────────────────────
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

// ── PUT /api/cameras/:id ──────────────────────────────────────────────────────
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
    res.json({ ...updated, flash_active: updated.flash_active === 1 });
  } catch (err) {
    console.error("[cameras] PUT /:id:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── DELETE /api/cameras/:id ───────────────────────────────────────────────────
router.delete("/:id", (req, res) => {
  try {
    const camera = db
      .prepare("SELECT id FROM cameras WHERE id = ?")
      .get(req.params.id);
    if (!camera) return res.status(404).json({ error: "Camera not found" });

    db.prepare("DELETE FROM cameras WHERE id = ?").run(req.params.id);
    res.status(204).send();
  } catch (err) {
    console.error("[cameras] DELETE /:id:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── POST /api/cameras/register ────────────────────────────────────────────────
// Called by ESP32 on boot to announce its IP. Authenticates with its unique api_key.
// Note: This must be defined BEFORE /:id routes to avoid param conflict.
router.post("/register", (req, res) => {
  const { id, ip } = req.body;
  if (!id || !ip) {
    return res.status(400).json({ error: "Missing id or ip in body" });
  }

  // Extract Bearer token from header
  const authHeader = req.headers["authorization"] || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  try {
    const camera = db.prepare("SELECT id, api_key FROM cameras WHERE id = ?").get(id);
    if (!camera) {
      return res
        .status(404)
        .json({ error: `No camera with id '${id}' found in DB` });
    }

    // Validate the token against the camera's specific api_key
    if (!token || token !== camera.api_key) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    db.prepare(
      "UPDATE cameras SET ip = ?, last_seen = ?, updated_at = ? WHERE id = ?",
    ).run(ip, now(), now(), id);

    console.log(`[cameras] ESP32 register: id=${id} ip=${ip}`);
    res.json({ ok: true, message: `Camera '${id}' registered at ${ip}` });
  } catch (err) {
    console.error("[cameras] POST /register:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── POST /api/cameras/:id/flash ───────────────────────────────────────────────
router.post("/:id/flash", (req, res) => {
  try {
    const camera = db
      .prepare("SELECT * FROM cameras WHERE id = ?")
      .get(req.params.id);
    if (!camera) return res.status(404).json({ error: "Camera not found" });

    const newState = camera.flash_active === 1 ? 0 : 1;
    db.prepare(
      "UPDATE cameras SET flash_active = ?, updated_at = ? WHERE id = ?",
    ).run(newState, now(), req.params.id);

    res.json({ ok: true, flash_active: newState === 1 });
  } catch (err) {
    console.error("[cameras] POST /:id/flash:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
