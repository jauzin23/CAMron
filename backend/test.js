// Integration test for CAMron backend
"use strict";

// Override env before requiring server
process.env.CAMERA_BEARER_TOKEN = "camron-test-token-abc123";
process.env.PORT = "13580";

const http = require("http");

function req(method, path, headers, body) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: "localhost",
      port: 13580,
      path,
      method,
      headers: { "Content-Type": "application/json", ...headers },
    };
    const r = http.request(opts, (res) => {
      let data = "";
      res.on("data", (d) => (data += d));
      res.on("end", () => resolve({ status: res.statusCode, body: data }));
    });
    r.on("error", reject);
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

async function runTests() {
  await new Promise((r) => setTimeout(r, 600));

  let pass = 0;
  let fail = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log("  PASS:", name);
      pass++;
    } catch (e) {
      console.log("  FAIL:", name, "->", e.message);
      fail++;
    }
  }

  await test("GET /health returns 200", async () => {
    const r = await req("GET", "/health", {});
    if (r.status !== 200) throw new Error("status=" + r.status);
  });

  await test("GET /stream without token returns 401", async () => {
    const r = await req("GET", "/stream", {});
    if (r.status !== 401) throw new Error("status=" + r.status);
  });

  await test("GET /stream with wrong token returns 401", async () => {
    const r = await req("GET", "/stream", { Authorization: "Bearer WRONG_TOKEN" });
    if (r.status !== 401) throw new Error("status=" + r.status);
  });

  await test("GET /stream with correct token but no camera returns 503", async () => {
    const r = await req("GET", "/stream", {
      Authorization: "Bearer camron-test-token-abc123",
    });
    if (r.status !== 503) throw new Error("status=" + r.status + " body=" + r.body);
  });

  await test("POST /api/camera/register without token returns 401", async () => {
    const r = await req("POST", "/api/camera/register", {}, { id: "cam1", ip: "192.168.1.50" });
    if (r.status !== 401) throw new Error("status=" + r.status);
  });

  await test("POST /api/camera/register with correct token returns 200", async () => {
    const r = await req(
      "POST",
      "/api/camera/register",
      { Authorization: "Bearer camron-test-token-abc123" },
      { id: "cam1", ip: "192.168.1.50" }
    );
    if (r.status !== 200) throw new Error("status=" + r.status + " body=" + r.body);
    const j = JSON.parse(r.body);
    if (!j.ok) throw new Error("ok not true: " + r.body);
  });

  await test("GET /api/cameras shows registered camera", async () => {
    const r = await req("GET", "/api/cameras", {
      Authorization: "Bearer camron-test-token-abc123",
    });
    if (r.status !== 200) throw new Error("status=" + r.status);
    const j = JSON.parse(r.body);
    if (!j.cam1 || j.cam1.ip !== "192.168.1.50")
      throw new Error("cam1 not found: " + r.body);
  });

  await test("GET /viewer returns HTML with fetch call", async () => {
    const r = await req("GET", "/viewer", {});
    if (r.status !== 200) throw new Error("status=" + r.status);
    if (!r.body.includes("<!DOCTYPE html>")) throw new Error("no HTML in response");
    if (!r.body.includes('fetch("/stream"')) throw new Error("no fetch call in viewer");
    if (!r.body.includes("Authorization")) throw new Error("no Authorization in viewer JS");
  });

  await test("GET /api/cameras without token returns 401", async () => {
    const r = await req("GET", "/api/cameras", {});
    if (r.status !== 401) throw new Error("status=" + r.status);
  });

  console.log("\nResults:", pass, "passed,", fail, "failed");
  process.exit(fail > 0 ? 1 : 0);
}

// Suppress startup console noise in test
const origLog = console.log;
require("./server.js");
console.log = origLog;

runTests().catch((e) => {
  console.error("Test runner error:", e);
  process.exit(1);
});
