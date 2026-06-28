// =============================================================
// CAMron - Backend Server (entry point)
// Mounts modular route files:
//   /api/cameras  ← camera CRUD + ESP32 register + flashlight
//   /stream       ← MJPEG proxy to camera
//   /viewer       ← Simple HTML viewer (LAN-only diagnostic)
//   /health       ← Uptime check
// =============================================================

"use strict";

require("dotenv").config();

const express = require("express");
const cors = require("cors");

const { initSchema } = require("./db/schema");
const camerasRouter = require("./routes/cameras");
const streamRouter = require("./routes/stream");

const app = express();
const PORT = process.env.PORT || 3000;

// Validate required env vars before doing anything else
const CAMERA_BEARER_TOKEN = process.env.CAMERA_BEARER_TOKEN;
if (
  !CAMERA_BEARER_TOKEN ||
  CAMERA_BEARER_TOKEN === "REPLACE_WITH_YOUR_SECRET_TOKEN"
) {
  console.error(
    "ERROR: CAMERA_BEARER_TOKEN is not set in .env - refusing to start.",
  );
  process.exit(1);
}

// ── Boot DB ──────────────────────────────────────────────────────────────────
initSchema();

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/cameras", camerasRouter);
app.use("/stream", streamRouter);

app.get("/health", (_req, res) => res.status(200).json({ ok: true }));

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\nCAMron backend listening on http://localhost:${PORT}`);
  console.log(`  Health   → http://localhost:${PORT}/health`);
  console.log(`  Cameras  → http://localhost:${PORT}/api/cameras`);
  console.log(
    `  Stream   → http://localhost:${PORT}/stream  (bearer required)`,
  );
  console.log(`  Viewer   → http://localhost:${PORT}/stream/viewer`);
  console.log(
    `  Register → POST http://localhost:${PORT}/api/cameras/register  (bearer required)`,
  );
  console.log(`  Token    → ${CAMERA_BEARER_TOKEN.slice(0, 6)}...[redacted]\n`);
});
