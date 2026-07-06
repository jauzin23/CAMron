"use strict";

const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;

function verifySessionJWT(req, res, next) {
  const authHeader = req.headers["authorization"] || "";
  let token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

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
