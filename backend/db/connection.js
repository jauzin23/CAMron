"use strict";

const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");

const DATA_DIR = path.join(__dirname, "..", "data");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = process.env.NODE_ENV === "test" ? ":memory:" : path.join(DATA_DIR, "camron.db");

const db = new Database(DB_PATH);

if (process.env.NODE_ENV !== "test") {
  db.pragma("journal_mode = WAL");
  console.log(`[db] SQLite opened at ${DB_PATH}`);
}
db.pragma("foreign_keys = ON");

module.exports = db;
