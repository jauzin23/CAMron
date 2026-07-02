"use strict";

/**
 * Flash / compile route tests
 * Tests: network-info, compile/initiate, download, confirm-flash, confirm-status, cleanup
 */

const request = require("supertest");
const jwt = require("jsonwebtoken");
const { createTestDb, insertTestCamera } = require("./helpers/db");
const { createTestApp } = require("./helpers/app");


let db;
let app;

function makeAuthHeader() {
  return `Bearer ${jwt.sign({ role: "admin" }, process.env.JWT_SECRET, { expiresIn: "1h" })}`;
}

beforeEach(() => {
  db = createTestDb();
  app = createTestApp(db);
});

afterEach(() => {
  db.close();
});

// ─── GET /api/network-info ────────────────────────────────────────────────────

describe("GET /api/network-info", () => {
  it("returns ip and port", async () => {
    const res = await request(app)
      .get("/api/network-info")
      .set("Authorization", makeAuthHeader());

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("ip");
    expect(res.body).toHaveProperty("port");
  });

  it("returns HOST_IP env variable when set", async () => {
    const res = await request(app)
      .get("/api/network-info")
      .set("Authorization", makeAuthHeader());

    expect(res.body.ip).toBe("192.168.1.50");
  });

  it("returns 401 without JWT", async () => {
    const res = await request(app).get("/api/network-info");
    expect(res.status).toBe(401);
  });
});

// ─── POST /api/compile/initiate ───────────────────────────────────────────────

describe("POST /api/compile/initiate", () => {
  it("creates a new camera record and returns cameraId for new camera", async () => {
    const res = await request(app)
      .post("/api/compile/initiate")
      .set("Authorization", makeAuthHeader())
      .send({ wifi_ssid: "MyWifi", wifi_password: "secret123", name: "New ESP" });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("cameraId");

    // Camera should exist in DB
    const camera = db
      .prepare("SELECT * FROM cameras WHERE id = ?")
      .get(res.body.cameraId);
    expect(camera).not.toBeUndefined();
    expect(camera.wifi_ssid).toBe("MyWifi");
  });

  it("rotates api_key when re-flashing an existing camera", async () => {
    const oldApiKey = "m".repeat(64);
    insertTestCamera(db, { id: "cam-reflash", api_key: oldApiKey, name: "Old ESP" });

    const res = await request(app)
      .post("/api/compile/initiate")
      .set("Authorization", makeAuthHeader())
      .send({
        wifi_ssid: "NewWifi",
        wifi_password: "newpass",
        cameraId: "cam-reflash",
      });

    expect(res.status).toBe(200);
    expect(res.body.cameraId).toBe("cam-reflash");

    // api_key must have changed
    const updated = db
      .prepare("SELECT api_key FROM cameras WHERE id = ?")
      .get("cam-reflash");
    expect(updated.api_key).not.toBe(oldApiKey);
    expect(updated.api_key).toMatch(/^[0-9a-f]{64}$/);
  });

  it("returns 404 when cameraId refers to a non-existent camera", async () => {
    const res = await request(app)
      .post("/api/compile/initiate")
      .set("Authorization", makeAuthHeader())
      .send({
        wifi_ssid: "Test",
        wifi_password: "pass",
        cameraId: "does-not-exist",
      });

    expect(res.status).toBe(404);
  });

  it("returns 400 when wifi_ssid is missing", async () => {
    const res = await request(app)
      .post("/api/compile/initiate")
      .set("Authorization", makeAuthHeader())
      .send({ wifi_password: "pass" });

    expect(res.status).toBe(400);
  });

  it("returns 400 when wifi_password is missing", async () => {
    const res = await request(app)
      .post("/api/compile/initiate")
      .set("Authorization", makeAuthHeader())
      .send({ wifi_ssid: "MyWifi" });

    expect(res.status).toBe(400);
  });

  it("returns 400 when both wifi fields are missing", async () => {
    const res = await request(app)
      .post("/api/compile/initiate")
      .set("Authorization", makeAuthHeader())
      .send({});

    expect(res.status).toBe(400);
  });

  it("returns 401 without JWT", async () => {
    const res = await request(app)
      .post("/api/compile/initiate")
      .send({ wifi_ssid: "a", wifi_password: "b" });

    expect(res.status).toBe(401);
  });
});

// ─── GET /api/download/:cameraId/:filename ────────────────────────────────────

describe("GET /api/download/:cameraId/:filename", () => {
  it("returns 400 for path traversal attempt (..)", async () => {
    insertTestCamera(db, { id: "cam-dl", api_key: "n".repeat(64) });

    const res = await request(app)
      .get("/api/download/cam-dl/../../etc/passwd")
      .set("Authorization", makeAuthHeader());

    // Express router may decode path and the route param might not match,
    // but if it does, it should be rejected
    expect([400, 404]).toContain(res.status);
  });

  it("returns 400 for non-.bin file extension", async () => {
    insertTestCamera(db, { id: "cam-dl2", api_key: "o".repeat(64) });

    const res = await request(app)
      .get("/api/download/cam-dl2/script.sh")
      .set("Authorization", makeAuthHeader());

    expect(res.status).toBe(400);
  });

  it("returns 404 when file does not exist but camera record exists", async () => {
    insertTestCamera(db, { id: "cam-dl3", api_key: "p".repeat(64) });

    const res = await request(app)
      .get("/api/download/cam-dl3/firmware.bin")
      .set("Authorization", makeAuthHeader());

    expect(res.status).toBe(404);
  });

  it("returns 404 when camera record does not exist", async () => {
    const res = await request(app)
      .get("/api/download/nonexistent/firmware.bin")
      .set("Authorization", makeAuthHeader());

    expect(res.status).toBe(404);
  });

  it("returns 401 without JWT", async () => {
    const res = await request(app).get("/api/download/cam/firmware.bin");
    expect(res.status).toBe(401);
  });
});

// ─── POST /api/confirm-flash ──────────────────────────────────────────────────

describe("POST /api/confirm-flash (camera auth, no JWT)", () => {
  const CAM_ID = "cam-confirm";
  const CAM_API_KEY = "q".repeat(64);

  beforeEach(() => {
    insertTestCamera(db, { id: CAM_ID, api_key: CAM_API_KEY, name: "Flash ESP" });
  });

  it("returns 200 and inserts flash_history with valid api_key from DB", async () => {
    const res = await request(app)
      .post("/api/confirm-flash")
      .set("Authorization", `Bearer ${CAM_API_KEY}`)
      .send({ id: CAM_ID });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);

    const history = db
      .prepare("SELECT * FROM flash_history WHERE camera_id = ?")
      .all(CAM_ID);
    expect(history.length).toBeGreaterThanOrEqual(1);
  });

  it("returns 401 with wrong api_key", async () => {
    const res = await request(app)
      .post("/api/confirm-flash")
      .set("Authorization", "Bearer wrongkey")
      .send({ id: CAM_ID });

    expect(res.status).toBe(401);
  });

  it("returns 401 with missing Authorization header", async () => {
    const res = await request(app)
      .post("/api/confirm-flash")
      .send({ id: CAM_ID });

    expect(res.status).toBe(401);
  });

  it("returns 400 when camera id is missing from body", async () => {
    const res = await request(app)
      .post("/api/confirm-flash")
      .set("Authorization", `Bearer ${CAM_API_KEY}`)
      .send({});

    expect(res.status).toBe(400);
  });

  it("does NOT require JWT (camera auth bypass)", async () => {
    // Should work without a JWT token
    const res = await request(app)
      .post("/api/confirm-flash")
      .set("Authorization", `Bearer ${CAM_API_KEY}`)
      .send({ id: CAM_ID });

    expect(res.status).toBe(200);
  });
});

// ─── GET /api/confirm-status/:cameraId ───────────────────────────────────────

describe("GET /api/confirm-status/:cameraId", () => {
  it("returns { confirmed: false } when flash not yet confirmed", async () => {
    insertTestCamera(db, { id: "cam-status", api_key: "r".repeat(64) });

    const res = await request(app)
      .get("/api/confirm-status/cam-status")
      .set("Authorization", makeAuthHeader());

    expect(res.status).toBe(200);
    expect(res.body.confirmed).toBe(false);
  });

  it("returns 401 without JWT", async () => {
    const res = await request(app).get("/api/confirm-status/any");
    expect(res.status).toBe(401);
  });
});

// ─── POST /api/cleanup/:cameraId ─────────────────────────────────────────────

describe("POST /api/cleanup/:cameraId", () => {
  it("returns 200 when temp dir does not exist (idempotent)", async () => {
    const res = await request(app)
      .post("/api/cleanup/some-nonexistent-camera")
      .set("Authorization", makeAuthHeader());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("returns 401 without JWT", async () => {
    const res = await request(app).post("/api/cleanup/cam");
    expect(res.status).toBe(401);
  });
});
