"use strict";

/**
 * Auth route tests
 * Tests POST /api/auth/login and POST /api/auth/verify
 */

const request = require("supertest");
const jwt = require("jsonwebtoken");
const { createTestDb } = require("./helpers/db");
const { createTestApp } = require("./helpers/app");


let db;
let app;

beforeEach(() => {
  db = createTestDb();
  app = createTestApp(db);
});

afterEach(() => {
  db.close();
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────

describe("POST /api/auth/login", () => {
  it("returns 200 + token on correct PIN", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ pin: "1234" });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("token");
    expect(res.body).toHaveProperty("expiresAt");
    expect(typeof res.body.token).toBe("string");
    expect(typeof res.body.expiresAt).toBe("number");
  });

  it("token is a valid JWT signed with JWT_SECRET", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ pin: "1234" });

    const decoded = jwt.verify(res.body.token, process.env.JWT_SECRET);
    expect(decoded).toHaveProperty("role", "admin");
  });

  it("expiresAt is a timestamp in the future", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ pin: "1234" });

    expect(res.body.expiresAt).toBeGreaterThan(Date.now());
  });

  it("returns 401 on wrong PIN", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ pin: "9999" });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("error");
  });

  it("returns 400 when PIN is missing", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({});

    expect(res.status).toBe(400);
  });

  it("returns 400 when PIN has fewer than 4 digits", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ pin: "123" });

    expect(res.status).toBe(400);
  });

  it("returns 400 when PIN has more than 4 digits", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ pin: "12345" });

    expect(res.status).toBe(400);
  });

  it("returns 400 when PIN contains letters", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ pin: "12ab" });

    expect(res.status).toBe(400);
  });

  it("returns 400 when PIN is an integer instead of string", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ pin: 1234 });

    // PIN must be a string — integer should be rejected
    expect(res.status).toBe(400);
  });

  it("returns 400 when PIN is an empty string", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ pin: "" });

    expect(res.status).toBe(400);
  });
});

// ─── Rate limiting on /api/auth/login ─────────────────────────────────────────

describe("POST /api/auth/login — rate limiting", () => {
  it("returns 429 after 5 failed attempts within 1 minute", async () => {
    // Create app without SKIP_RATE_LIMIT to test actual rate limiting
    const rateLimitedApp = createTestApp(db);
    delete process.env.SKIP_RATE_LIMIT;

    // Make 5 requests (exhausts limit)
    for (let i = 0; i < 5; i++) {
      await request(rateLimitedApp).post("/api/auth/login").send({ pin: "0000" });
    }

    // 6th request should be rate limited
    const res = await request(rateLimitedApp)
      .post("/api/auth/login")
      .send({ pin: "0000" });

    expect(res.status).toBe(429);
    process.env.SKIP_RATE_LIMIT = "true";
  });
});

// ─── POST /api/auth/verify ────────────────────────────────────────────────────

describe("POST /api/auth/verify", () => {
  let validToken;

  beforeEach(async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ pin: "1234" });
    validToken = res.body.token;
  });

  it("returns 200 + { valid: true } for a valid token", async () => {
    const res = await request(app)
      .post("/api/auth/verify")
      .send({ token: validToken });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ valid: true });
    expect(res.body).toHaveProperty("expiresAt");
  });

  it("returns 401 with TOKEN_EXPIRED for an expired token", async () => {
    // Sign a token that expired 1 second ago
    const expiredToken = jwt.sign(
      { role: "admin" },
      process.env.JWT_SECRET,
      { expiresIn: -1 }
    );

    const res = await request(app)
      .post("/api/auth/verify")
      .send({ token: expiredToken });

    expect(res.status).toBe(401);
    expect(res.body.code).toBe("TOKEN_EXPIRED");
  });

  it("returns 401 with TOKEN_INVALID for a tampered token", async () => {
    const tamperedToken = validToken.slice(0, -5) + "XXXXX";

    const res = await request(app)
      .post("/api/auth/verify")
      .send({ token: tamperedToken });

    expect(res.status).toBe(401);
    expect(res.body.code).toBe("TOKEN_INVALID");
  });

  it("returns 401 for a token signed with the wrong secret", async () => {
    const wrongSecretToken = jwt.sign({ role: "admin" }, "wrong-secret", { expiresIn: "1h" });

    const res = await request(app)
      .post("/api/auth/verify")
      .send({ token: wrongSecretToken });

    expect(res.status).toBe(401);
    expect(res.body.code).toBe("TOKEN_INVALID");
  });

  it("returns 400 when token is missing from body", async () => {
    const res = await request(app)
      .post("/api/auth/verify")
      .send({});

    expect(res.status).toBe(400);
  });
});
