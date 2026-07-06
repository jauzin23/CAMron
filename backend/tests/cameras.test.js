"use strict";

const request = require("supertest");
const jwt = require("jsonwebtoken");
const { createTestDb, insertTestCamera } = require("./helpers/db");
const { createTestApp } = require("./helpers/app");


let db;
let app;
let authToken;

function makeAuthHeader() {
  return `Bearer ${jwt.sign({ role: "admin" }, process.env.JWT_SECRET, { expiresIn: "1h" })}`;
}

beforeEach(() => {
  db = createTestDb();
  app = createTestApp(db);
  authToken = makeAuthHeader();
});

afterEach(() => {
  db.close();
});

describe("GET /api/cameras", () => {
  it("returns 401 without JWT", async () => {
    const res = await request(app).get("/api/cameras");
    expect(res.status).toBe(401);
  });

  it("returns empty array when no cameras exist", async () => {
    const res = await request(app)
      .get("/api/cameras")
      .set("Authorization", authToken);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("returns cameras as an array", async () => {
    insertTestCamera(db, { id: "cam-1", name: "Camera One", api_key: "a".repeat(64) });
    insertTestCamera(db, { id: "cam-2", name: "Camera Two", api_key: "b".repeat(64) });

    const res = await request(app)
      .get("/api/cameras")
      .set("Authorization", authToken);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(2);
  });

  it("coerces flash_active to boolean (not 0/1 integer)", async () => {
    insertTestCamera(db, { id: "cam-1", api_key: "a".repeat(64) });

    const res = await request(app)
      .get("/api/cameras")
      .set("Authorization", authToken);

    expect(typeof res.body[0].flash_active).toBe("boolean");
    expect(res.body[0].flash_active).toBe(false);
  });
});

describe("POST /api/cameras", () => {
  it("creates a camera and returns 201 with the camera object", async () => {
    const res = await request(app)
      .post("/api/cameras")
      .set("Authorization", authToken)
      .send({ name: "My Camera" });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body).toHaveProperty("api_key");
    expect(res.body.name).toBe("My Camera");
    expect(res.body.flash_active).toBe(false);
  });

  it("api_key is a 64-character hex string", async () => {
    const res = await request(app)
      .post("/api/cameras")
      .set("Authorization", authToken)
      .send({ name: "Test" });

    expect(res.body.api_key).toMatch(/^[0-9a-f]{64}$/);
  });

  it("returns 400 when name is missing", async () => {
    const res = await request(app)
      .post("/api/cameras")
      .set("Authorization", authToken)
      .send({});

    expect(res.status).toBe(400);
  });

  it("returns 400 when name is an empty string", async () => {
    const res = await request(app)
      .post("/api/cameras")
      .set("Authorization", authToken)
      .send({ name: "" });

    expect(res.status).toBe(400);
  });

  it("returns 400 when name is only whitespace", async () => {
    const res = await request(app)
      .post("/api/cameras")
      .set("Authorization", authToken)
      .send({ name: "   " });

    expect(res.status).toBe(400);
  });

  it("trims whitespace from camera name", async () => {
    const res = await request(app)
      .post("/api/cameras")
      .set("Authorization", authToken)
      .send({ name: "  My Camera  " });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe("My Camera");
  });

  it("returns 401 without JWT", async () => {
    const res = await request(app)
      .post("/api/cameras")
      .send({ name: "Test" });

    expect(res.status).toBe(401);
  });
});

describe("GET /api/cameras/:id", () => {
  it("returns the camera for an existing id", async () => {
    insertTestCamera(db, { id: "cam-abc", name: "Found Camera", api_key: "c".repeat(64) });

    const res = await request(app)
      .get("/api/cameras/cam-abc")
      .set("Authorization", authToken);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe("cam-abc");
    expect(res.body.name).toBe("Found Camera");
  });

  it("returns 404 for a non-existent id", async () => {
    const res = await request(app)
      .get("/api/cameras/does-not-exist")
      .set("Authorization", authToken);

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("error");
  });

  it("returns 401 without JWT", async () => {
    const res = await request(app).get("/api/cameras/some-id");
    expect(res.status).toBe(401);
  });
});

describe("PUT /api/cameras/:id", () => {
  it("renames an existing camera", async () => {
    insertTestCamera(db, { id: "cam-rename", name: "Old Name", api_key: "d".repeat(64) });

    const res = await request(app)
      .put("/api/cameras/cam-rename")
      .set("Authorization", authToken)
      .send({ name: "New Name" });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe("New Name");
    expect(res.body.id).toBe("cam-rename");
  });

  it("returns 404 for a non-existent camera", async () => {
    const res = await request(app)
      .put("/api/cameras/not-real")
      .set("Authorization", authToken)
      .send({ name: "Whatever" });

    expect(res.status).toBe(404);
  });

  it("returns 400 when name is missing", async () => {
    insertTestCamera(db, { id: "cam-put", api_key: "e".repeat(64) });

    const res = await request(app)
      .put("/api/cameras/cam-put")
      .set("Authorization", authToken)
      .send({});

    expect(res.status).toBe(400);
  });

  it("returns 400 when name is empty string", async () => {
    insertTestCamera(db, { id: "cam-put2", api_key: "f".repeat(64) });

    const res = await request(app)
      .put("/api/cameras/cam-put2")
      .set("Authorization", authToken)
      .send({ name: "" });

    expect(res.status).toBe(400);
  });

  it("returns 401 without JWT", async () => {
    const res = await request(app)
      .put("/api/cameras/any")
      .send({ name: "Name" });

    expect(res.status).toBe(401);
  });
});

describe("DELETE /api/cameras/:id", () => {
  it("deletes an existing camera and returns 204", async () => {
    insertTestCamera(db, { id: "cam-del", api_key: "g".repeat(64) });

    const res = await request(app)
      .delete("/api/cameras/cam-del")
      .set("Authorization", authToken);

    expect(res.status).toBe(204);
    expect(res.text).toBe("");
  });

  it("camera is actually removed from the database", async () => {
    insertTestCamera(db, { id: "cam-del2", api_key: "h".repeat(64) });

    await request(app)
      .delete("/api/cameras/cam-del2")
      .set("Authorization", authToken);

    const camera = db.prepare("SELECT id FROM cameras WHERE id = ?").get("cam-del2");
    expect(camera).toBeUndefined();
  });

  it("deleting a camera cascades to flash_history", async () => {
    insertTestCamera(db, { id: "cam-cascade", api_key: "i".repeat(64) });
    db.prepare("INSERT INTO flash_history (camera_id, success) VALUES (?, 1)").run("cam-cascade");

    await request(app)
      .delete("/api/cameras/cam-cascade")
      .set("Authorization", authToken);

    const history = db
      .prepare("SELECT * FROM flash_history WHERE camera_id = ?")
      .all("cam-cascade");
    expect(history).toHaveLength(0);
  });

  it("returns 404 for a non-existent camera", async () => {
    const res = await request(app)
      .delete("/api/cameras/ghost-camera")
      .set("Authorization", authToken);

    expect(res.status).toBe(404);
  });

  it("returns 401 without JWT", async () => {
    const res = await request(app).delete("/api/cameras/any");
    expect(res.status).toBe(401);
  });
});

describe("POST /api/cameras/register (camera auth)", () => {
  const API_KEY = "k".repeat(64);
  const CAMERA_ID = "cam-register";

  beforeEach(() => {
    insertTestCamera(db, { id: CAMERA_ID, api_key: API_KEY, name: "ESP32" });
  });

  it("returns 200 and updates ip + last_seen with valid api_key", async () => {
    const res = await request(app)
      .post("/api/cameras/register")
      .set("Authorization", `Bearer ${API_KEY}`)
      .send({ id: CAMERA_ID, ip: "192.168.1.100" });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);

    const camera = db.prepare("SELECT ip, last_seen FROM cameras WHERE id = ?").get(CAMERA_ID);
    expect(camera.ip).toBe("192.168.1.100");
    expect(camera.last_seen).not.toBeNull();
  });

  it("inserts a record into flash_history on successful registration", async () => {
    await request(app)
      .post("/api/cameras/register")
      .set("Authorization", `Bearer ${API_KEY}`)
      .send({ id: CAMERA_ID, ip: "192.168.1.100" });

    const history = db
      .prepare("SELECT * FROM flash_history WHERE camera_id = ?")
      .all(CAMERA_ID);
    expect(history.length).toBeGreaterThanOrEqual(1);
  });

  it("returns 401 with wrong api_key", async () => {
    const res = await request(app)
      .post("/api/cameras/register")
      .set("Authorization", "Bearer wrongkey")
      .send({ id: CAMERA_ID, ip: "192.168.1.100" });

    expect(res.status).toBe(401);
  });

  it("returns 401 with missing Authorization header", async () => {
    const res = await request(app)
      .post("/api/cameras/register")
      .send({ id: CAMERA_ID, ip: "192.168.1.100" });

    expect(res.status).toBe(401);
  });

  it("returns 400 when id is missing from body", async () => {
    const res = await request(app)
      .post("/api/cameras/register")
      .set("Authorization", `Bearer ${API_KEY}`)
      .send({ ip: "192.168.1.100" });

    expect(res.status).toBe(400);
  });

  it("returns 400 when ip is missing from body", async () => {
    const res = await request(app)
      .post("/api/cameras/register")
      .set("Authorization", `Bearer ${API_KEY}`)
      .send({ id: CAMERA_ID });

    expect(res.status).toBe(400);
  });

  it("returns 404 when camera id does not exist in DB", async () => {
    const res = await request(app)
      .post("/api/cameras/register")
      .set("Authorization", `Bearer ${API_KEY}`)
      .send({ id: "non-existent-id", ip: "192.168.1.1" });

    expect(res.status).toBe(404);
  });

  it("does NOT require JWT (camera auth bypass)", async () => {
    const res = await request(app)
      .post("/api/cameras/register")
      .set("Authorization", `Bearer ${API_KEY}`)
      .send({ id: CAMERA_ID, ip: "10.0.0.1" });

    expect(res.status).toBe(200);
  });
});
