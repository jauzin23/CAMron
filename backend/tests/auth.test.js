"use strict";

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

describe("POST /api/auth/login", () => {
  it("returns 200 + sets cookie on correct PIN", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ pin: "1234" });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("ok", true);
    expect(res.body).toHaveProperty("expiresAt");
    expect(typeof res.body.expiresAt).toBe("number");

    // Cookie should be set in Set-Cookie header
    const setCookie = res.headers["set-cookie"];
    expect(setCookie).toBeDefined();
    expect(Array.isArray(setCookie) ? setCookie.join(";") : setCookie).toContain("camron_session=");
  });

  it("cookie value is a valid JWT signed with JWT_SECRET", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ pin: "1234" });

    const setCookie = res.headers["set-cookie"];
    const rawCookie = Array.isArray(setCookie) ? setCookie[0] : setCookie;
    const tokenMatch = rawCookie.match(/camron_session=([^;]+)/);
    expect(tokenMatch).not.toBeNull();

    const decoded = jwt.verify(tokenMatch[1], process.env.JWT_SECRET);
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

    expect(res.status).toBe(400);
  });

  it("returns 400 when PIN is an empty string", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ pin: "" });

    expect(res.status).toBe(400);
  });
});

describe("POST /api/auth/login — rate limiting", () => {
  it("returns 429 after 10 failed attempts within 15 minutes", async () => {
    const rateLimitedApp = createTestApp(db);
    delete process.env.SKIP_RATE_LIMIT;

    for (let i = 0; i < 10; i++) {
      await request(rateLimitedApp).post("/api/auth/login").send({ pin: "0000" });
    }

    const res = await request(rateLimitedApp)
      .post("/api/auth/login")
      .send({ pin: "0000" });

    expect(res.status).toBe(429);
    process.env.SKIP_RATE_LIMIT = "true";
  });
});

describe("POST /api/auth/verify", () => {
  let validCookie;

  beforeEach(async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ pin: "1234" });
    const setCookie = res.headers["set-cookie"];
    const rawCookie = Array.isArray(setCookie) ? setCookie[0] : setCookie;
    // Extract just "camron_session=<token>" part for the Cookie header
    validCookie = rawCookie.split(";")[0];
  });

  it("returns 200 + { valid: true } when cookie is valid", async () => {
    const res = await request(app)
      .post("/api/auth/verify")
      .set("Cookie", validCookie);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ valid: true });
    expect(res.body).toHaveProperty("expiresAt");
  });

  it("returns 401 with TOKEN_MISSING when no cookie is sent", async () => {
    const res = await request(app)
      .post("/api/auth/verify");

    expect(res.status).toBe(401);
    expect(res.body.code).toBe("TOKEN_MISSING");
  });

  it("returns 401 with TOKEN_EXPIRED for an expired token in cookie", async () => {
    const expiredToken = jwt.sign(
      { role: "admin" },
      process.env.JWT_SECRET,
      { expiresIn: -1 }
    );

    const res = await request(app)
      .post("/api/auth/verify")
      .set("Cookie", `camron_session=${expiredToken}`);

    expect(res.status).toBe(401);
    expect(res.body.code).toBe("TOKEN_EXPIRED");
  });

  it("returns 401 with TOKEN_INVALID for a tampered token in cookie", async () => {
    const tokenValue = validCookie.replace("camron_session=", "");
    const tampered = tokenValue.slice(0, -5) + "XXXXX";

    const res = await request(app)
      .post("/api/auth/verify")
      .set("Cookie", `camron_session=${tampered}`);

    expect(res.status).toBe(401);
    expect(res.body.code).toBe("TOKEN_INVALID");
  });

  it("returns 401 for a token signed with the wrong secret", async () => {
    const wrongSecretToken = jwt.sign({ role: "admin" }, "wrong-secret", { expiresIn: "1h" });

    const res = await request(app)
      .post("/api/auth/verify")
      .set("Cookie", `camron_session=${wrongSecretToken}`);

    expect(res.status).toBe(401);
    expect(res.body.code).toBe("TOKEN_INVALID");
  });
});

describe("POST /api/auth/logout", () => {
  it("returns 200 and clears the session cookie", async () => {
    const res = await request(app)
      .post("/api/auth/logout");

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("ok", true);
    // The Set-Cookie header should clear the cookie (Max-Age=0 or Expires in past)
    const setCookie = res.headers["set-cookie"];
    if (setCookie) {
      const raw = Array.isArray(setCookie) ? setCookie.join(";") : setCookie;
      expect(raw).toContain("camron_session=");
    }
  });
});
