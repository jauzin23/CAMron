"use strict";

const express = require("express");
const camerasRouter = require("../../routes/cameras");
const flashRouter = require("../../routes/flash");
const authRouter = require("../../routes/auth");
const { verifySessionJWT } = require("../../middleware/auth");

function createTestApp() {
  const app = express();

  app.use(express.json());

  app.get("/health", (_req, res) => res.status(200).json({ ok: true }));

  app.use("/api/auth", authRouter);

  app.use(
    "/api/cameras",
    (req, res, next) => {
      if (req.method === "POST" && req.path === "/register") return next();
      return verifySessionJWT(req, res, next);
    },
    camerasRouter
  );

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
