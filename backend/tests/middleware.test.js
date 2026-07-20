"use strict";

const request = require("supertest");
const jwt = require("jsonwebtoken");
const { createTestDb } = require("./helpers/db");
const { createTestApp } = require("./helpers/app");


let db;
let app;

function makeValidToken() {
  return jwt.sign({ role: "admin" }, process.env.JWT_SECRET, { expiresIn: "1h" });
}

beforeEach(() => {
  db = createTestDb();
  app = createTestApp(db);
});

afterEach(() => {
  db.close();
});

describe("verifySessionJWT middleware", () => {
  it("allows request with valid token in camron_session cookie", async () => {
    const token = makeValidToken();
    const res = await request(app)
      .get("/api/cameras")
      .set("Cookie", `camron_session=${token}`);

    expect(res.status).toBe(200);
  });

  it("allows request with valid Bearer token in Authorization header (fallback)", async () => {
    const token = makeValidToken();
    const res = await request(app)
      .get("/api/cameras")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
  });

  it("cookie takes priority over Authorization header", async () => {
    const validToken = makeValidToken();
    // Use a bad Authorization header but a valid cookie — should succeed
    const res = await request(app)
      .get("/api/cameras")
      .set("Cookie", `camron_session=${validToken}`)
      .set("Authorization", "Bearer bad-token");

    expect(res.status).toBe(200);
  });

  it("returns 401 TOKEN_MISSING when no token is provided at all", async () => {
    const res = await request(app).get("/api/cameras");

    expect(res.status).toBe(401);
    expect(res.body.code).toBe("TOKEN_MISSING");
  });

  it("returns 401 TOKEN_EXPIRED for an expired token in cookie", async () => {
    const expiredToken = jwt.sign(
      { role: "admin" },
      process.env.JWT_SECRET,
      { expiresIn: -1 }
    );

    const res = await request(app)
      .get("/api/cameras")
      .set("Cookie", `camron_session=${expiredToken}`);

    expect(res.status).toBe(401);
    expect(res.body.code).toBe("TOKEN_EXPIRED");
  });

  it("returns 401 TOKEN_INVALID for a tampered token in cookie", async () => {
    const token = makeValidToken();
    const tampered = token.slice(0, -5) + "ZZZZZ";

    const res = await request(app)
      .get("/api/cameras")
      .set("Cookie", `camron_session=${tampered}`);

    expect(res.status).toBe(401);
    expect(res.body.code).toBe("TOKEN_INVALID");
  });

  it("returns 401 TOKEN_INVALID for a token signed with a different secret", async () => {
    const wrongToken = jwt.sign({ role: "admin" }, "completely-wrong-secret", { expiresIn: "1h" });

    const res = await request(app)
      .get("/api/cameras")
      .set("Cookie", `camron_session=${wrongToken}`);

    expect(res.status).toBe(401);
    expect(res.body.code).toBe("TOKEN_INVALID");
  });

  it("returns 401 TOKEN_MISSING when Authorization header is malformed (no 'Bearer ' prefix)", async () => {
    const token = makeValidToken();

    const res = await request(app)
      .get("/api/cameras")
      .set("Authorization", token);

    expect(res.status).toBe(401);
    expect(res.body.code).toBe("TOKEN_MISSING");
  });

  it("rejects ?token= query parameter (intentionally removed)", async () => {
    const token = makeValidToken();
    const res = await request(app)
      .get(`/api/cameras?token=${token}`);

    // No cookie or Authorization header — must reject
    expect(res.status).toBe(401);
    expect(res.body.code).toBe("TOKEN_MISSING");
  });
});
