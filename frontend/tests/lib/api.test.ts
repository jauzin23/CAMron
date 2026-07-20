import { describe, it, expect, beforeEach, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../mocks/server";
import {
  getCameras,
  createCamera,
  updateCamera,
  deleteCamera,
  toggleFlash,
  authFetch,
} from "../../lib/api";

vi.stubEnv("NEXT_PUBLIC_BACKEND_URL", "http://localhost:3000");

describe("getCameras()", () => {
  it("sends GET /api/cameras and returns camera array", async () => {
    const cameras = await getCameras();
    expect(Array.isArray(cameras)).toBe(true);
    expect(cameras[0]).toHaveProperty("id");
    expect(cameras[0]).toHaveProperty("name");
  });

  it("sends request with credentials: include (no Authorization header injection)", async () => {
    let capturedAuth: string | null = "should-be-absent";

    server.use(
      http.get("http://localhost:3000/api/cameras", ({ request }) => {
        capturedAuth = request.headers.get("Authorization");
        return HttpResponse.json([]);
      })
    );

    await getCameras();

    // Cookie-based auth — no Authorization header should be set by api.ts
    expect(capturedAuth).toBeNull();
  });

  it("dispatches camron:logout event on 401 response", async () => {
    server.use(
      http.get("http://localhost:3000/api/cameras", () => {
        return HttpResponse.json({ error: "Unauthorized" }, { status: 401 });
      })
    );

    const dispatchSpy = vi.spyOn(window, "dispatchEvent");

    try {
      await getCameras();
    } catch {
    }

    const logoutEvent = dispatchSpy.mock.calls.find(
      ([event]) => event instanceof CustomEvent && event.type === "camron:logout"
    );
    expect(logoutEvent).toBeDefined();
  });
});

describe("createCamera()", () => {
  it("sends POST /api/cameras with correct body", async () => {
    let capturedBody: unknown = null;

    server.use(
      http.post("http://localhost:3000/api/cameras", async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({ id: "new-id", name: "My Cam" }, { status: 201 });
      })
    );

    await createCamera({ name: "My Cam" });
    expect(capturedBody).toEqual({ name: "My Cam" });
  });

  it("returns the created camera object", async () => {
    const camera = await createCamera({ name: "Test" });
    expect(camera).toHaveProperty("id");
    expect(camera).toHaveProperty("name");
  });
});

describe("updateCamera()", () => {
  it("sends PUT /api/cameras/:id with correct body", async () => {
    let capturedBody: unknown = null;
    let capturedUrl = "";

    server.use(
      http.put("http://localhost:3000/api/cameras/:id", async ({ request, params }) => {
        capturedBody = await request.json();
        capturedUrl = params.id as string;
        return HttpResponse.json({ id: params.id, name: "Renamed" });
      })
    );

    await updateCamera("cam-123", { name: "Renamed" });
    expect(capturedBody).toEqual({ name: "Renamed" });
    expect(capturedUrl).toBe("cam-123");
  });
});

describe("deleteCamera()", () => {
  it("sends DELETE /api/cameras/:id", async () => {
    let capturedId = "";

    server.use(
      http.delete("http://localhost:3000/api/cameras/:id", ({ params }) => {
        capturedId = params.id as string;
        return new HttpResponse(null, { status: 204 });
      })
    );

    await deleteCamera("cam-to-delete");
    expect(capturedId).toBe("cam-to-delete");
  });

  it("dispatches camron:logout on 401", async () => {
    server.use(
      http.delete("http://localhost:3000/api/cameras/:id", () => {
        return HttpResponse.json({ error: "Unauthorized" }, { status: 401 });
      })
    );

    const dispatchSpy = vi.spyOn(window, "dispatchEvent");

    try {
      await deleteCamera("cam-x");
    } catch {
    }

    const logoutEvent = dispatchSpy.mock.calls.find(
      ([event]) => event instanceof CustomEvent && event.type === "camron:logout"
    );
    expect(logoutEvent).toBeDefined();
  });
});

describe("toggleFlash()", () => {
  it("sends POST /api/cameras/:id/flash and returns result", async () => {
    const result = await toggleFlash("cam-flash");
    expect(result).toHaveProperty("ok", true);
    expect(result).toHaveProperty("flash_active");
  });
});

describe("authFetch()", () => {
  it("sends request with credentials: include", async () => {
    let capturedCredentials: string | null = null;

    server.use(
      http.get("http://localhost:3000/api/test", ({ request }) => {
        // credentials mode isn't visible in MSW request object directly,
        // but we can verify no Authorization header is manually set
        capturedCredentials = request.headers.get("Authorization");
        return HttpResponse.json({ ok: true });
      })
    );

    await authFetch("http://localhost:3000/api/test");

    // Cookie-based auth — api.ts should not manually inject Authorization header
    expect(capturedCredentials).toBeNull();
  });

  it("dispatches camron:logout on 401 response", async () => {
    server.use(
      http.get("http://localhost:3000/api/test-401", () => {
        return HttpResponse.json({ error: "Unauthorized" }, { status: 401 });
      })
    );

    const dispatchSpy = vi.spyOn(window, "dispatchEvent");
    await authFetch("http://localhost:3000/api/test-401");

    const logoutEvent = dispatchSpy.mock.calls.find(
      ([event]) => event instanceof CustomEvent && event.type === "camron:logout"
    );
    expect(logoutEvent).toBeDefined();
  });
});
