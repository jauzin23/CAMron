"use strict";

const db = require("./connection");

/**
 * Runs CREATE TABLE IF NOT EXISTS for all tables on boot.
 * No migration system - just idempotent schema creation.
 */
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

  console.log("[db] Schema ready.");
}

module.exports = { initSchema };
