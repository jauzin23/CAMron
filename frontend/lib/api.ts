// Camera API endpoints for CAMron. All calls go to NEXT_PUBLIC_BACKEND_URL.

const BACKEND_URL =
  typeof window !== "undefined"
    ? (process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3000")
    : (process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3000");

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
  const res = await fetch(`${BACKEND_URL}/api/cameras`);
  if (!res.ok) throw new Error(`getCameras failed: ${res.status}`);
  return res.json();
}

export async function createCamera(data: { name: string }): Promise<Camera> {
  const res = await fetch(`${BACKEND_URL}/api/cameras`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? "createCamera failed");
  }
  return res.json();
}

export async function getCamera(id: string): Promise<Camera> {
  const res = await fetch(`${BACKEND_URL}/api/cameras/${id}`);
  if (!res.ok) throw new Error(`getCamera failed: ${res.status}`);
  return res.json();
}

export async function updateCamera(
  id: string,
  data: { name: string },
): Promise<Camera> {
  const res = await fetch(`${BACKEND_URL}/api/cameras/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? "updateCamera failed");
  }
  return res.json();
}

export async function deleteCamera(id: string): Promise<void> {
  const res = await fetch(`${BACKEND_URL}/api/cameras/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(`deleteCamera failed: ${res.status}`);
}

export async function toggleFlash(
  id: string,
): Promise<{ ok: boolean; flash_active: boolean }> {
  const res = await fetch(`${BACKEND_URL}/api/cameras/${id}/flash`, {
    method: "POST",
  });
  if (!res.ok) throw new Error(`toggleFlash failed: ${res.status}`);
  return res.json();
}


