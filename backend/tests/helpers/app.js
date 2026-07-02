"use strict";

/**
 * Test Express app factory using the real backend routers and middleware.
 */

const express = require("express");
const camerasRouter = require("../../routes/cameras");
const flashRouter = require("../../routes/flash");
const authRouter = require("../../routes/auth");
const { verifySessionJWT } = require("../../middleware/auth");

/**
 * Creates a test Express app instance by mounting the real routes and middlewares.
 * This guarantees the tests cover the actual production source code.
 */
function createTestApp() {
  const app = express();

  app.use(express.json());

  // Health
  app.get("/health", (_req, res) => res.status(200).json({ ok: true }));

  // Auth (public)
  app.use("/api/auth", authRouter);

  // Cameras (JWT protected, except /register)
  app.use(
    "/api/cameras",
    (req, res, next) => {
      if (req.method === "POST" && req.path === "/register") return next();
      return verifySessionJWT(req, res, next);
    },
    camerasRouter
  );

  // Flash routes (JWT protected, except /confirm-flash)
  app.use(
    "/api",
    (req, res, next) => {
      if (req.method === "POST" && req.path === "/confirm-flash") return next();
      return verifySessionJWT(req, res, next);
    },
    flashRouter
  );

  return app;
}

module.exports = { createTestApp };
