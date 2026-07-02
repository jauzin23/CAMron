"use strict";

const express = require("express");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");

const router = express.Router();

const APP_PIN = process.env.APP_PIN;
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRY = process.env.JWT_EXPIRY || "15m";

// Limit login attempts to 5 per minute per IP
const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts, please try again later." },
  skip: () => process.env.NODE_ENV === "test" && process.env.SKIP_RATE_LIMIT === "true",
});

/**
 * POST /api/auth/login
 * Validates the PIN and issues a short-lived JWT session token.
 * Body: { pin: string }
 */
router.post("/login", loginLimiter, (req, res) => {
  const { pin } = req.body;

  if (!pin || typeof pin !== "string") {
    return res.status(400).json({ error: "Missing or invalid PIN" });
  }

  // Validate PIN length (4 digits, numeric only)
  if (!/^\d{4}$/.test(pin)) {
    return res.status(400).json({ error: "The PIN must be exactly 4 numeric digits" });
  }

  if (pin !== APP_PIN) {
    return res.status(401).json({ error: "Incorrect PIN" });
  }

  const token = jwt.sign({ role: "admin" }, JWT_SECRET, { expiresIn: JWT_EXPIRY });

  // Parse expiry to return it to the client in a friendly format
  const decoded = jwt.decode(token);
  return res.json({ token, expiresAt: decoded.exp * 1000 });
});

/**
 * POST /api/auth/verify
 * Verifies if the current JWT token is still valid.
 * Used by the frontend on page load to avoid asking for the PIN again.
 * Body: { token: string }
 */
router.post("/verify", (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ error: "Missing token" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return res.json({ valid: true, expiresAt: decoded.exp * 1000 });
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ valid: false, error: "Session expired", code: "TOKEN_EXPIRED" });
    }
    return res.status(401).json({ valid: false, error: "Invalid token", code: "TOKEN_INVALID" });
  }
});

module.exports = router;
