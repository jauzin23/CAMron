"use strict";

const db = require("./connection");
function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS cameras (
      id           TEXT PRIMARY KEY,
      api_key      TEXT UNIQUE NOT NULL,
      name         TEXT NOT NULL,
      ip           TEXT DEFAULT '',
      last_seen    TEXT DEFAULT NULL,
      flash_active INTEGER DEFAULT 0 CHECK(flash_active IN (0, 1)),
      created_at   TEXT DEFAULT (datetime('now')),
      updated_at   TEXT DEFAULT (datetime('now'))
    );
  `);
  const tableInfo = db.prepare("PRAGMA table_info(cameras)").all();
  const columns = tableInfo.map((col) => col.name);

  if (!columns.includes("wifi_ssid")) {
    db.exec("ALTER TABLE cameras ADD COLUMN wifi_ssid TEXT DEFAULT NULL;");
    console.log("[db] Migrated: added column wifi_ssid to cameras table.");
  }
  if (!columns.includes("wifi_pass")) {
    db.exec("ALTER TABLE cameras ADD COLUMN wifi_pass TEXT DEFAULT NULL;");
    console.log("[db] Migrated: added column wifi_pass to cameras table.");
  }
  db.exec(`
    CREATE TABLE IF NOT EXISTS flash_history (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      camera_id     TEXT NOT NULL REFERENCES cameras(id) ON DELETE CASCADE,
      flashed_at    TEXT DEFAULT (datetime('now')),
      success       INTEGER DEFAULT 1 CHECK(success IN (0, 1))
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key           TEXT PRIMARY KEY,
      value         TEXT NOT NULL
    );
  `);

  console.log("[db] Schema ready.");
}

module.exports = { initSchema };
