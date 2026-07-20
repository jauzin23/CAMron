const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "";

/**
 * Wraps fetch with credentials: "include" so the HttpOnly session cookie
 * is automatically forwarded on every request. Also dispatches the global
 * camron:logout event when the server responds with 401.
 */
export async function authFetch(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const res = await fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string> | undefined),
    },
  });

  if (res.status === 401 && typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("camron:logout"));
  }

  return res;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (res.status === 401) {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("camron:logout"));
    }
    const data = await res.json().catch(() => ({}));
    throw new Error(
      data.error ?? "Sessão expirada. Introduza o PIN novamente.",
    );
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(data.error ?? `Erro ${res.status}`);
  }
  return res.json();
}

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

export async function getCameras(): Promise<Camera[]> {
  const res = await authFetch(`${BACKEND_URL}/api/cameras`);
  return handleResponse<Camera[]>(res);
}

export async function createCamera(data: { name: string }): Promise<Camera> {
  const res = await authFetch(`${BACKEND_URL}/api/cameras`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  return handleResponse<Camera>(res);
}

export async function getCamera(id: string): Promise<Camera> {
  const res = await authFetch(`${BACKEND_URL}/api/cameras/${id}`);
  return handleResponse<Camera>(res);
}

export async function updateCamera(
  id: string,
  data: { name: string },
): Promise<Camera> {
  const res = await authFetch(`${BACKEND_URL}/api/cameras/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  return handleResponse<Camera>(res);
}

export async function deleteCamera(id: string): Promise<void> {
  const res = await authFetch(`${BACKEND_URL}/api/cameras/${id}`, {
    method: "DELETE",
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
  const res = await authFetch(`${BACKEND_URL}/api/cameras/${id}/flash`, {
    method: "POST",
  });
  return handleResponse<{ ok: boolean; flash_active: boolean }>(res);
}
