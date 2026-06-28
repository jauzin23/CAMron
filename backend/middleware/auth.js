"use strict";

const CAMERA_BEARER_TOKEN = process.env.CAMERA_BEARER_TOKEN;

/**
 * Middleware: verifies Bearer token in Authorization header or ?token= query param.
 * Used for ESP32-facing endpoints only (register, stream, ingest).
 * Returns true if authorized, false if not (response already sent).
 */
function verifyBearer(req, res) {
  const authHeader = req.headers["authorization"] || "";
  let token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token && req.query.token) {
    token = req.query.token;
  }

  if (!token || token !== CAMERA_BEARER_TOKEN) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

module.exports = { verifyBearer };
