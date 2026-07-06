"use strict";

const request = require("supertest");
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

describe("GET /health", () => {
  it("returns 200 with { ok: true } without authentication", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it("returns JSON content-type", async () => {
    const res = await request(app).get("/health");
    expect(res.headers["content-type"]).toMatch(/application\/json/);
  });
});
