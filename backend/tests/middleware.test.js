"use strict";

/**
 * JWT middleware tests (verifySessionJWT)
 * Tests the middleware in isolation and via the protected routes.
 */

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

// We test the middleware via a JWT-protected route: GET /api/cameras
describe("verifySessionJWT middleware", () => {
  it("allows request with valid Bearer token in Authorization header", async () => {
    const token = makeValidToken();
    const res = await request(app)
      .get("/api/cameras")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
  });

  it("allows request with valid token as ?token= query param", async () => {
    const token = makeValidToken();
    const res = await request(app)
      .get(`/api/cameras?token=${token}`);

    expect(res.status).toBe(200);
  });

  it("returns 401 TOKEN_MISSING when no token is provided", async () => {
    const res = await request(app).get("/api/cameras");

    expect(res.status).toBe(401);
    expect(res.body.code).toBe("TOKEN_MISSING");
  });

  it("returns 401 TOKEN_EXPIRED for an expired token", async () => {
    const expiredToken = jwt.sign(
      { role: "admin" },
      process.env.JWT_SECRET,
      { expiresIn: -1 }
    );

    const res = await request(app)
      .get("/api/cameras")
      .set("Authorization", `Bearer ${expiredToken}`);

    expect(res.status).toBe(401);
    expect(res.body.code).toBe("TOKEN_EXPIRED");
  });

  it("returns 401 TOKEN_INVALID for a tampered token", async () => {
    const token = makeValidToken();
    const tampered = token.slice(0, -5) + "ZZZZZ";

    const res = await request(app)
      .get("/api/cameras")
      .set("Authorization", `Bearer ${tampered}`);

    expect(res.status).toBe(401);
    expect(res.body.code).toBe("TOKEN_INVALID");
  });

  it("returns 401 TOKEN_INVALID for a token signed with a different secret", async () => {
    const wrongToken = jwt.sign({ role: "admin" }, "completely-wrong-secret", { expiresIn: "1h" });

    const res = await request(app)
      .get("/api/cameras")
      .set("Authorization", `Bearer ${wrongToken}`);

    expect(res.status).toBe(401);
    expect(res.body.code).toBe("TOKEN_INVALID");
  });

  it("returns 401 TOKEN_MISSING when Authorization header is malformed (no 'Bearer ' prefix)", async () => {
    const token = makeValidToken();

    const res = await request(app)
      .get("/api/cameras")
      .set("Authorization", token); // missing "Bearer " prefix

    expect(res.status).toBe(401);
    expect(res.body.code).toBe("TOKEN_MISSING");
  });
});
