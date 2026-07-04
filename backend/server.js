"use strict";

require("dotenv").config();

const express = require("express");
const cors = require("cors");

const { initSchema } = require("./db/schema");
const camerasRouter = require("./routes/cameras");
const streamRouter = require("./routes/stream");
const flashRouter = require("./routes/flash");
const authRouter = require("./routes/auth");
const path = require("path");
const fs = require("fs");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./docs/swagger");
const { verifySessionJWT } = require("./middleware/auth");

const app = express();
const PORT = process.env.PORT || 3000;

const APP_PIN = process.env.APP_PIN;
const JWT_SECRET = process.env.JWT_SECRET;

if (!APP_PIN || !/^\d{4}$/.test(APP_PIN)) {
  console.error(
    "ERROR: APP_PIN must be a 4-digit numeric PIN in .env - refusing to start.",
  );
  process.exit(1);
}
if (!JWT_SECRET || JWT_SECRET === "REPLACE_WITH_A_LONG_RANDOM_SECRET") {
  console.error("ERROR: JWT_SECRET is not set in .env - refusing to start.");
  process.exit(1);
}

initSchema();

const tempDirRoot = path.join(__dirname, "temp");
if (fs.existsSync(tempDirRoot)) {
  try {
    fs.rmSync(tempDirRoot, { recursive: true, force: true });
    console.log("[server] Cleaned up old temp directories on startup.");
  } catch (err) {
    console.error(
      "[server] Failed to clean up temp directory on startup:",
      err,
    );
  }
}
fs.mkdirSync(tempDirRoot, { recursive: true });

app.use(cors());
app.use(express.json());

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use("/api/auth", authRouter);
app.get("/health", (_req, res) => res.status(200).json({ ok: true }));

// ESP32 registration bypasses JWT (verified via api_key in the handler)
app.use(
  "/api/cameras",
  (req, res, next) => {
    if (req.method === "POST" && req.path === "/register") {
      return next();
    }
    return verifySessionJWT(req, res, next);
  },
  camerasRouter,
);

// ESP32 flash confirmation bypasses JWT (verified via api_key in the handler)
app.use(
  "/api",
  (req, res, next) => {
    if (req.method === "POST" && req.path === "/confirm-flash") {
      return next();
    }
    return verifySessionJWT(req, res, next);
  },
  flashRouter,
);

app.use("/stream", verifySessionJWT, streamRouter);

app.listen(PORT, () => {
  console.log(`\nCAMron backend listening on http://localhost:${PORT}`);
  console.log(`  Health   : http://localhost:${PORT}/health`);
  console.log(
    `  Auth     : POST http://localhost:${PORT}/api/auth/login (public)`,
  );
  console.log(`  Cameras  : http://localhost:${PORT}/api/cameras`);
  console.log(`  Stream   : http://localhost:${PORT}/stream`);
  console.log(
    `  Register : POST http://localhost:${PORT}/api/cameras/register (camera api_key)`,
  );
  console.log(
    `  Confirm  : POST http://localhost:${PORT}/api/confirm-flash (camera api_key)\n`,
  );
});
