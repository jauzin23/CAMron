"use strict";

/**
 * Test DB helper using the real connection in test mode (in-memory).
 */

const db = require("../../db/connection");
const { initSchema } = require("../../db/schema");

/**
 * Prepares the singleton in-memory database by running schema initialization
 * and wiping all tables to ensure a fresh test run.
 * @returns {import('better-sqlite3').Database}
 */
function createTestDb() {
  initSchema();
  
  // Wipe all records for test isolation
  db.exec("DELETE FROM flash_history");
  db.exec("DELETE FROM cameras");
  db.exec("DELETE FROM settings");

  // Prevent individual tests from closing the shared database connection
  db.close = () => {};
  
  return db;
}

/**
 * Inserts a test camera into the database and returns it.
 * @param {import('better-sqlite3').Database} db
 * @param {Partial<{id: string, name: string, api_key: string, ip: string}>} overrides
 */
function insertTestCamera(db, overrides = {}) {
  const camera = {
    id: overrides.id || "test-camera-id",
    api_key: overrides.api_key || "a".repeat(64),
    name: overrides.name || "Test Camera",
    ip: overrides.ip || "",
    ...overrides,
  };

  db.prepare(`
    INSERT INTO cameras (id, api_key, name, ip, created_at, updated_at)
    VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
  `).run(camera.id, camera.api_key, camera.name, camera.ip);

  return db.prepare("SELECT * FROM cameras WHERE id = ?").get(camera.id);
}

module.exports = { createTestDb, insertTestCamera };
