"use strict";

const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;
const COOKIE_NAME = "camron_session";

function verifySessionJWT(req, res, next) {
  // Primary: HttpOnly session cookie (browser sessions)
  let token = req.cookies?.[COOKIE_NAME] || null;

  // Fallback: Authorization Bearer header (API / tooling)
  if (!token) {
    const authHeader = req.headers["authorization"] || "";
    token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  }

  // The ?token= query param fallback has been intentionally removed.
  // Tokens in URLs are logged by proxies and CDNs.

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
