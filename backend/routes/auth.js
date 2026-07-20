"use strict";

const express = require("express");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");

const router = express.Router();

const APP_PIN = process.env.APP_PIN;
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRY = process.env.JWT_EXPIRY || "15m";

const COOKIE_NAME = "camron_session";

/** Parse a JWT expiry string like "15m", "1h", "7d" into milliseconds */
function expiryToMs(expiry) {
  const match = String(expiry).match(/^(\d+)(s|m|h|d)$/);
  if (!match) return 15 * 60 * 1000; // default 15 min
  const value = parseInt(match[1], 10);
  const unit = match[2];
  const multipliers = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return value * multipliers[unit];
}

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  maxAge: expiryToMs(JWT_EXPIRY),
  path: "/",
};

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts, please try again later." },
  skip: () => process.env.NODE_ENV === "test" && process.env.SKIP_RATE_LIMIT === "true",
});

router.post("/login", loginLimiter, (req, res) => {
  const { pin } = req.body;

  if (!pin || typeof pin !== "string") {
    return res.status(400).json({ error: "Missing or invalid PIN" });
  }

  if (!/^\d{4}$/.test(pin)) {
    return res.status(400).json({ error: "The PIN must be exactly 4 numeric digits" });
  }

  if (pin !== APP_PIN) {
    return res.status(401).json({ error: "Incorrect PIN" });
  }

  const token = jwt.sign({ role: "admin" }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
  const decoded = jwt.decode(token);

  res.cookie(COOKIE_NAME, token, cookieOptions);
  return res.json({ ok: true, expiresAt: decoded.exp * 1000 });
});

router.post("/verify", (req, res) => {
  const token = req.cookies?.[COOKIE_NAME];

  if (!token) {
    return res.status(401).json({ valid: false, error: "No session cookie", code: "TOKEN_MISSING" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return res.json({ valid: true, expiresAt: decoded.exp * 1000 });
  } catch (err) {
    res.clearCookie(COOKIE_NAME, { path: "/" });
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ valid: false, error: "Session expired", code: "TOKEN_EXPIRED" });
    }
    return res.status(401).json({ valid: false, error: "Invalid token", code: "TOKEN_INVALID" });
  }
});

router.post("/logout", (req, res) => {
  res.clearCookie(COOKIE_NAME, { path: "/" });
  return res.json({ ok: true });
});

module.exports = router;
