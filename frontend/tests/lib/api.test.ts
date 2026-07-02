/**
 * Tests for frontend/lib/api.ts
 * Verifies that the API client correctly constructs requests, attaches auth headers,
 * and dispatches the camron:logout event on 401 responses.
 */
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

// The API client reads from NEXT_PUBLIC_BACKEND_URL — MSW handlers are on localhost:3000
// Since NEXT_PUBLIC_BACKEND_URL defaults to "" we need to set it
vi.stubEnv("NEXT_PUBLIC_BACKEND_URL", "http://localhost:3000");

const SESSION_KEY = "camron_jwt";

beforeEach(() => {
  sessionStorage.clear();
});

// ─── getCameras ───────────────────────────────────────────────────────────────

describe("getCameras()", () => {
  it("sends GET /api/cameras and returns camera array", async () => {
    const cameras = await getCameras();
    expect(Array.isArray(cameras)).toBe(true);
    expect(cameras[0]).toHaveProperty("id");
    expect(cameras[0]).toHaveProperty("name");
  });

  it("attaches Authorization header when token is in sessionStorage", async () => {
    let capturedAuth: string | null = null;

    server.use(
      http.get("http://localhost:3000/api/cameras", ({ request }) => {
        capturedAuth = request.headers.get("Authorization");
        return HttpResponse.json([]);
      })
    );

    sessionStorage.setItem(SESSION_KEY, "my-test-token");
    await getCameras();

    expect(capturedAuth).toBe("Bearer my-test-token");
  });

  it("sends no Authorization header when no token in sessionStorage", async () => {
    let capturedAuth: string | null = "present";

    server.use(
      http.get("http://localhost:3000/api/cameras", ({ request }) => {
        capturedAuth = request.headers.get("Authorization");
        return HttpResponse.json([]);
      })
    );

    sessionStorage.removeItem(SESSION_KEY);
    await getCameras();

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
      // Expected to throw
    }

    const logoutEvent = dispatchSpy.mock.calls.find(
      ([event]) => event instanceof CustomEvent && event.type === "camron:logout"
    );
    expect(logoutEvent).toBeDefined();
  });
});

// ─── createCamera ─────────────────────────────────────────────────────────────

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

// ─── updateCamera ─────────────────────────────────────────────────────────────

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

// ─── deleteCamera ─────────────────────────────────────────────────────────────

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
      // Expected to throw
    }

    const logoutEvent = dispatchSpy.mock.calls.find(
      ([event]) => event instanceof CustomEvent && event.type === "camron:logout"
    );
    expect(logoutEvent).toBeDefined();
  });
});

// ─── toggleFlash ─────────────────────────────────────────────────────────────

describe("toggleFlash()", () => {
  it("sends POST /api/cameras/:id/flash and returns result", async () => {
    const result = await toggleFlash("cam-flash");
    expect(result).toHaveProperty("ok", true);
    expect(result).toHaveProperty("flash_active");
  });
});

// ─── authFetch ────────────────────────────────────────────────────────────────

describe("authFetch()", () => {
  it("attaches token from sessionStorage to request", async () => {
    let capturedAuth: string | null = null;

    server.use(
      http.get("http://localhost:3000/api/test", ({ request }) => {
        capturedAuth = request.headers.get("Authorization");
        return HttpResponse.json({ ok: true });
      })
    );

    sessionStorage.setItem(SESSION_KEY, "authfetch-token");
    await authFetch("http://localhost:3000/api/test");

    expect(capturedAuth).toBe("Bearer authfetch-token");
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
