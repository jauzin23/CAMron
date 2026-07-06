import { http, HttpResponse } from "msw";

const BASE = "http://localhost:3000";

export const mockCamera = {
  id: "cam-test-id",
  api_key: "a".repeat(64),
  name: "Test Camera",
  ip: "192.168.1.100",
  last_seen: new Date().toISOString(),
  flash_active: false,
  created_at: "2025-01-01T00:00:00.000Z",
  updated_at: "2025-01-01T00:00:00.000Z",
  wifi_ssid: null,
  wifi_pass: null,
};

export const handlers = [
  http.post(`${BASE}/api/auth/login`, async ({ request }) => {
    const body = (await request.json()) as { pin?: string };
    if (body.pin === "1234") {
      return HttpResponse.json({
        token: "mock-jwt-token",
        expiresAt: Date.now() + 60 * 60 * 1000,
      });
    }
    return HttpResponse.json({ error: "Incorrect PIN" }, { status: 401 });
  }),

  http.post(`${BASE}/api/auth/verify`, async ({ request }) => {
    const body = (await request.json()) as { token?: string };
    if (body.token === "mock-jwt-token") {
      return HttpResponse.json({
        valid: true,
        expiresAt: Date.now() + 60 * 60 * 1000,
      });
    }
    return HttpResponse.json(
      { valid: false, code: "TOKEN_INVALID" },
      { status: 401 }
    );
  }),

  http.get(`${BASE}/api/cameras`, () => {
    return HttpResponse.json([mockCamera]);
  }),

  http.post(`${BASE}/api/cameras`, async ({ request }) => {
    const body = (await request.json()) as { name?: string };
    return HttpResponse.json(
      { ...mockCamera, name: body.name ?? "New Camera" },
      { status: 201 }
    );
  }),

  http.get(`${BASE}/api/cameras/:id`, ({ params }) => {
    return HttpResponse.json({ ...mockCamera, id: params.id as string });
  }),

  http.put(`${BASE}/api/cameras/:id`, async ({ params, request }) => {
    const body = (await request.json()) as { name?: string };
    return HttpResponse.json({
      ...mockCamera,
      id: params.id as string,
      name: body.name ?? mockCamera.name,
    });
  }),

  http.delete(`${BASE}/api/cameras/:id`, () => {
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${BASE}/api/cameras/:id/flash`, () => {
    return HttpResponse.json({ ok: true, flash_active: true });
  }),
];
