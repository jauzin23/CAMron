"use strict";

const request = require("supertest");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { createTestDb, insertTestCamera } = require("./helpers/db");
const { createTestApp } = require("./helpers/app");


let db;
let app;

function makeAuthHeader() {
  return `Bearer ${jwt.sign({ role: "admin" }, process.env.JWT_SECRET, { expiresIn: "1h" })}`;
}

/** Generate a valid RFC 4122 v4 UUID for use in tests */
function uuid() {
  return crypto.randomUUID();
}

beforeEach(() => {
  db = createTestDb();
  app = createTestApp(db);
});

afterEach(() => {
  db.close();
});

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

describe("POST /api/compile/initiate", () => {
  it("creates a new camera record and returns cameraId for new camera", async () => {
    const res = await request(app)
      .post("/api/compile/initiate")
      .set("Authorization", makeAuthHeader())
      .send({ wifi_ssid: "MyWifi", wifi_password: "secret123", name: "New ESP" });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("cameraId");

    const camera = db
      .prepare("SELECT * FROM cameras WHERE id = ?")
      .get(res.body.cameraId);
    expect(camera).not.toBeUndefined();
    expect(camera.wifi_ssid).toBe("MyWifi");
  });

  it("rotates api_key when re-flashing an existing camera", async () => {
    const camId = uuid();
    const oldApiKey = "m".repeat(64);
    insertTestCamera(db, { id: camId, api_key: oldApiKey, name: "Old ESP" });

    const res = await request(app)
      .post("/api/compile/initiate")
      .set("Authorization", makeAuthHeader())
      .send({
        wifi_ssid: "NewWifi",
        wifi_password: "newpass",
        cameraId: camId,
      });

    expect(res.status).toBe(200);
    expect(res.body.cameraId).toBe(camId);

    const updated = db
      .prepare("SELECT api_key FROM cameras WHERE id = ?")
      .get(camId);
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
        cameraId: uuid(),
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

describe("GET /api/download/:cameraId/:filename", () => {
  it("returns 400 for invalid (non-UUID) cameraId", async () => {
    const res = await request(app)
      .get("/api/download/not-a-uuid/firmware.bin")
      .set("Authorization", makeAuthHeader());

    expect(res.status).toBe(400);
  });

  it("returns 400 for path traversal attempt (..)", async () => {
    const camId = uuid();
    insertTestCamera(db, { id: camId, api_key: "n".repeat(64) });

    const res = await request(app)
      .get(`/api/download/${camId}/../../etc/passwd`)
      .set("Authorization", makeAuthHeader());

    expect([400, 404]).toContain(res.status);
  });

  it("returns 400 for non-.bin file extension", async () => {
    const camId = uuid();
    insertTestCamera(db, { id: camId, api_key: "o".repeat(64) });

    const res = await request(app)
      .get(`/api/download/${camId}/script.sh`)
      .set("Authorization", makeAuthHeader());

    expect(res.status).toBe(400);
  });

  it("returns 404 when file does not exist but camera record exists", async () => {
    const camId = uuid();
    insertTestCamera(db, { id: camId, api_key: "p".repeat(64) });

    const res = await request(app)
      .get(`/api/download/${camId}/firmware.bin`)
      .set("Authorization", makeAuthHeader());

    expect(res.status).toBe(404);
  });

  it("returns 404 when camera record does not exist", async () => {
    const res = await request(app)
      .get(`/api/download/${uuid()}/firmware.bin`)
      .set("Authorization", makeAuthHeader());

    expect(res.status).toBe(404);
  });

  it("returns 401 without JWT", async () => {
    const res = await request(app).get(`/api/download/${uuid()}/firmware.bin`);
    expect(res.status).toBe(401);
  });
});

describe("POST /api/confirm-flash (camera auth, no JWT)", () => {
  let CAM_ID;
  const CAM_API_KEY = "q".repeat(64);

  beforeEach(() => {
    CAM_ID = uuid();
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
    const res = await request(app)
      .post("/api/confirm-flash")
      .set("Authorization", `Bearer ${CAM_API_KEY}`)
      .send({ id: CAM_ID });

    expect(res.status).toBe(200);
  });
});

describe("GET /api/confirm-status/:cameraId", () => {
  it("returns { confirmed: false } when flash not yet confirmed", async () => {
    const camId = uuid();
    insertTestCamera(db, { id: camId, api_key: "r".repeat(64) });

    const res = await request(app)
      .get(`/api/confirm-status/${camId}`)
      .set("Authorization", makeAuthHeader());

    expect(res.status).toBe(200);
    expect(res.body.confirmed).toBe(false);
  });

  it("returns 400 for invalid (non-UUID) cameraId", async () => {
    const res = await request(app)
      .get("/api/confirm-status/not-a-uuid")
      .set("Authorization", makeAuthHeader());

    expect(res.status).toBe(400);
  });

  it("returns 401 without JWT", async () => {
    const res = await request(app).get(`/api/confirm-status/${uuid()}`);
    expect(res.status).toBe(401);
  });
});

describe("POST /api/cleanup/:cameraId", () => {
  it("returns 200 when temp dir does not exist (idempotent)", async () => {
    const res = await request(app)
      .post(`/api/cleanup/${uuid()}`)
      .set("Authorization", makeAuthHeader());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("returns 400 for invalid (non-UUID) cameraId", async () => {
    const res = await request(app)
      .post("/api/cleanup/not-a-uuid")
      .set("Authorization", makeAuthHeader());

    expect(res.status).toBe(400);
  });

  it("returns 401 without JWT", async () => {
    const res = await request(app).post(`/api/cleanup/${uuid()}`);
    expect(res.status).toBe(401);
  });
});
