// =============================================================
// CAMron - Camera API
// All calls go to NEXT_PUBLIC_BACKEND_URL (default: localhost:3000)
// No auth required on frontend-facing endpoints (single-user system)
// =============================================================

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

// =============================================================
// Legacy / mock functions (kept for compatibility)
// =============================================================

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "https://vaivarrer.jauzin23.com";
const ACCESS_KEY = "cliente_access_token";
const REFRESH_KEY = "cliente_refresh_token";
const LICENSE_KEY = "cliente_license_key";

function getAccessToken() {
  return typeof window !== "undefined"
    ? localStorage.getItem(ACCESS_KEY)
    : null;
}

function setAccessToken(token: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACCESS_KEY, token);
}

function getRefreshToken() {
  return typeof window !== "undefined"
    ? localStorage.getItem(REFRESH_KEY)
    : null;
}

export async function setClientTokens(
  accessToken: string,
  refreshToken?: string,
) {
  setAccessToken(accessToken);
  if (typeof window !== "undefined" && refreshToken) {
    localStorage.setItem(REFRESH_KEY, refreshToken);
  }
}

export function setClientLicenseKey(chave: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LICENSE_KEY, chave);
}

export function getClientLicenseKey() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(LICENSE_KEY) ?? "";
}

export async function refreshClientAccessToken() {
  const refresh = getRefreshToken();
  if (!refresh) throw new Error("Sem refresh token");
  const data = {
    accessToken: "mock_access_token",
    refreshToken: "mock_refresh_token",
  };
  await setClientTokens(data.accessToken, data.refreshToken);
  return data.accessToken;
}

export async function restoreSession() {
  const refresh = getRefreshToken();
  if (!refresh) return false;
  try {
    await refreshClientAccessToken();
    return true;
  } catch {
    return false;
  }
}

async function withClientAuth(path: string, init: RequestInit = {}) {
  let access = getAccessToken();
  const headers = new Headers(init.headers);
  if (access) headers.set("Authorization", `Bearer ${access}`);

  // Mock return empty response as it shouldn't be used directly now
  return new Response(JSON.stringify({}), { status: 200 });
}

export async function clienteSessaoIniciar(input: {
  hwid: string;
  janela_processo?: string;
  servidor?: string;
}) {
  return { success: true };
}

export async function clienteSessaoFecharAberta() {
  return { success: true };
}

export type ClienteSessao = {
  id: string;
  inicio_em: string;
  fim_em: string | null;
  hwid: string;
  servidor?: string;
  estado: "ativa" | "concluida";
  duracao_segundos: number;
};

export async function clienteSessoes(
  limit = 10,
  offset = 0,
): Promise<{ rows: ClienteSessao[]; total: number }> {
  return {
    rows: [
      {
        id: "sess-mock",
        inicio_em: new Date().toISOString(),
        fim_em: null,
        hwid: "mock-hwid",
        estado: "ativa",
        duracao_segundos: 120,
      },
    ],
    total: 1,
  };
}

export type ClientePerfil = {
  id: string;
  nome_utilizador: string;
  hwid: string | null;
  pais: string;
  fuso_horario: string;
  criado_em: string;
  chave?: string | null;
  chave_tipo?: string | null;
  expira_em?: string | null;
};

export type ClienteProfile = ClientePerfil;

export async function clienteMe(): Promise<ClientePerfil> {
  return {
    id: "mock-user-1",
    nome_utilizador: "Mock User",
    hwid: "mock-hwid",
    pais: "PT",
    fuso_horario: "Europe/Lisbon",
    criado_em: new Date().toISOString(),
    chave: "mock-license-key",
    chave_tipo: "Premium",
    expira_em: "2099-12-31T23:59:59Z",
  };
}

export async function clienteAtualizarPerfil(input: {
  nome_utilizador?: string;
  pais?: string;
  fuso_horario?: string;
}) {
  return { success: true };
}

export async function getDesktopInstallationId() {
  if (typeof window === "undefined") return "desktop-unknown";
  try {
  } catch (e) {
    console.error("Failed to get HWID from backend:", e);
  }

  const key = "desktop_installation_id";
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const id = `desktop-${crypto.randomUUID()}`;
  localStorage.setItem(key, id);
  return id;
}

export type ServerBot = {
  id: string;
  version: string;
  download_url: string;
};

export type ServerInfo = {
  id: string;
  name: string;
  logo_url?: string;
  latest_bot: ServerBot | null;
};

export async function getModels(): Promise<ServerInfo[]> {
  return [
    {
      id: "mock-srv-1",
      name: "Servidor Exemplo 1",
      logo_url: "",
      latest_bot: { id: "bot-1", version: "1.0.0", download_url: "#" },
    },
    {
      id: "mock-srv-2",
      name: "Servidor Exemplo 2",
      logo_url: "",
      latest_bot: null,
    },
  ];
}
