// Camera API endpoints for CAMron. All calls go to NEXT_PUBLIC_BACKEND_URL.
// Every request automatically attaches the JWT session token from sessionStorage.
// Any 401 response triggers a logout by dispatching a custom "camron:logout" event,
// which the AuthProvider listens to.

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "";
const SESSION_KEY = "camron_jwt";

// ── Helpers ──────────────────────────────────────────────────────────────────

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(SESSION_KEY);
}

function authHeaders(extra?: Record<string, string>): Record<string, string> {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

/**
 * A drop-in replacement for fetch() that automatically injects the JWT token
 * and handles 401 errors by dispatching the camron:logout event.
 */
export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken();
  const headers = new Headers(options.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(url, { ...options, headers });

  if (res.status === 401 && typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("camron:logout"));
  }

  return res;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (res.status === 401) {
    // Token expired or invalid — trigger a global logout event
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("camron:logout"));
    }
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "Sessão expirada. Introduza o PIN novamente.");
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(data.error ?? `Erro ${res.status}`);
  }
  return res.json();
}

// ── Types ────────────────────────────────────────────────────────────────────

export type Camera = {
  id: string;
  api_key: string;
  name: string;
  ip: string;
  last_seen: string | null;
  flash_active: boolean;
  created_at: string;
  updated_at: string;
  wifi_ssid?: string | null;
  wifi_pass?: string | null;
};

// ── Camera endpoints ─────────────────────────────────────────────────────────

export async function getCameras(): Promise<Camera[]> {
  const res = await fetch(`${BACKEND_URL}/api/cameras`, {
    headers: authHeaders(),
  });
  return handleResponse<Camera[]>(res);
}

export async function createCamera(data: { name: string }): Promise<Camera> {
  const res = await fetch(`${BACKEND_URL}/api/cameras`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse<Camera>(res);
}

export async function getCamera(id: string): Promise<Camera> {
  const res = await fetch(`${BACKEND_URL}/api/cameras/${id}`, {
    headers: authHeaders(),
  });
  return handleResponse<Camera>(res);
}

export async function updateCamera(
  id: string,
  data: { name: string },
): Promise<Camera> {
  const res = await fetch(`${BACKEND_URL}/api/cameras/${id}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse<Camera>(res);
}

export async function deleteCamera(id: string): Promise<void> {
  const res = await fetch(`${BACKEND_URL}/api/cameras/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (res.status === 401) {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("camron:logout"));
    }
    throw new Error("Sessão expirada. Introduza o PIN novamente.");
  }
  if (!res.ok) throw new Error(`deleteCamera failed: ${res.status}`);
}

export async function toggleFlash(
  id: string,
): Promise<{ ok: boolean; flash_active: boolean }> {
  const res = await fetch(`${BACKEND_URL}/api/cameras/${id}/flash`, {
    method: "POST",
    headers: authHeaders(),
  });
  return handleResponse<{ ok: boolean; flash_active: boolean }>(res);
}
