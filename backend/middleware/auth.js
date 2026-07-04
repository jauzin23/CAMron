"use strict";

const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Middleware: verifies a short-lived JWT session token issued by POST /api/auth/login.
 * Used for all dashboard/frontend-facing endpoints.
 * Accepts the token from:
 *   - Authorization header: "Bearer <jwt>"
 *   - Query parameter: ?token=<jwt>  (used by <img> src for MJPEG stream)
 * Returns 401 with a structured JSON error if the token is missing, invalid, or expired.
 */
function verifySessionJWT(req, res, next) {
  const authHeader = req.headers["authorization"] || "";
  let token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  // Allow token via query param (needed for MJPEG stream URLs used in <img> tags)
  if (!token && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ error: "Token missing", code: "TOKEN_MISSING" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.session = decoded;
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Session expired", code: "TOKEN_EXPIRED" });
    }
    return res.status(401).json({ error: "Invalid token", code: "TOKEN_INVALID" });
  }
}

module.exports = { verifySessionJWT };
