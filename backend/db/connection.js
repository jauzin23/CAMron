"use strict";

const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");

// Ensure data directory exists
const DATA_DIR = path.join(__dirname, "..", "data");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, "camron.db");

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent performance
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

console.log(`[db] SQLite opened at ${DB_PATH}`);

module.exports = db;
