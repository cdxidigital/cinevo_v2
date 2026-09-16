export const DEFAULT_NODE = "http://127.0.0.1:48184";

export function normalizeNodeUrl(value: string) {
  const raw = value.trim();
  if (!raw) return DEFAULT_NODE;
  try {
    const url = new URL(raw.includes("://") ? raw : `http://${raw}`);
    if (!['http:', 'https:'].includes(url.protocol)) return DEFAULT_NODE;
    url.pathname = url.pathname.replace(/\/$/, "");
    url.search = "";
    url.hash = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return DEFAULT_NODE;
  }
}

export type NodeConnection = {
  id: string;
  provider: "plex" | "jellyfin" | "preview" | string;
  baseUrl: string;
  createdAt: string;
  updatedAt: string;
};

export type NodeStatus = {
  deviceId: string;
  version?: string;
  connections: NodeConnection[];
  selectedLibraries?: string[];
};

async function nodeFetch(base: string, path: string, init: RequestInit = {}) {
  const url = `${base.replace(/\/$/, "")}${path}`;
  try {
    const res = await fetch(url, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init.headers || {}) },
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    return { res, data };
  } catch {
    return {
      res: { ok: false, status: 0 } as Response,
      data: { error: "CINEVO Node is not reachable." } as Record<string, unknown>,
    };
  }
}

export async function checkNode(base: string) {
  try {
    const { res, data } = await nodeFetch(base, "/health");
    if (!res.ok) return { ok: false as const, error: "CINEVO Node is not responding" };
    return { ok: true as const, deviceId: String(data.deviceId || ""), version: String(data.version || "") };
  } catch {
    return { ok: false as const, error: "CINEVO Node was not found at this address." };
  }
}

export async function pairNode(base: string, code: string) {
  const { res, data } = await nodeFetch(base, "/v1/pair", {
    method: "POST",
    body: JSON.stringify({ code: code.trim().toUpperCase() }),
  });
  if (!res.ok || typeof data.token !== "string") {
    return { ok: false as const, error: String(data.error || "Pairing was not accepted") };
  }
  return { ok: true as const, token: data.token, deviceId: String(data.deviceId || "") };
}

export async function nodeStatus(base: string, token: string) {
  const { res, data } = await nodeFetch(base, "/v1/status", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return { ok: false as const, error: String(data.error || "The local pairing session expired") };
  return { ok: true as const, status: data as unknown as NodeStatus };
}

export async function revokeConnection(base: string, token: string, connectionId: string) {
  const { res, data } = await nodeFetch(base, "/v1/connections/revoke", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ connectionId }),
  });
  if (!res.ok) return { ok: false as const, error: String(data.error || "Could not remove that connection") };
  return { ok: true as const };
}

export async function addNodeConnection(
  base: string,
  token: string,
  body: { provider: "plex" | "jellyfin" | "preview"; baseUrl?: string; token?: string; username?: string; password?: string },
) {
  const { res, data } = await nodeFetch(base, "/v1/connections", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) return { ok: false as const, error: String(data.error || "Could not add that server") };
  return { ok: true as const, id: String(data.id || ""), provider: String(data.provider || body.provider) };
}

export type NodeSection = { key: string; title: string; type?: string; count?: number };

export async function listNodeSections(base: string, token: string, connectionId: string) {
  const { res, data } = await nodeFetch(base, "/v1/sections", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ connectionId }),
  });
  if (!res.ok) return { ok: false as const, error: String(data.error || "Could not list library sections") };
  return { ok: true as const, sections: (data.sections as NodeSection[]) || [] };
}

export async function importNodeSections(
  base: string,
  token: string,
  connectionId: string,
  sectionKeys: string[],
) {
  const { res, data } = await nodeFetch(base, "/v1/import", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ connectionId, sectionKeys }),
  });
  if (!res.ok) return { ok: false as const, error: String(data.error || "Import failed") };
  return { ok: true as const, titles: (data.titles as Array<Record<string, string>>) || [] };
}

export async function addNodeFolder(base: string, token: string, folderPath: string) {
  const { res, data } = await nodeFetch(base, "/v1/folders", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ path: folderPath }),
  });
  if (!res.ok) return { ok: false as const, error: String(data.error || "Could not add that folder") };
  return {
    ok: true as const,
    id: String(data.id || ""),
    name: String(data.name || folderPath),
    titles: (data.titles as Array<Record<string, string>>) || [],
    count: Number(data.count || 0),
  };
}

export async function listNodeFolders(base: string, token: string) {
  const { res, data } = await nodeFetch(base, "/v1/folders", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return { ok: false as const, error: String(data.error || "Could not list folders") };
  return { ok: true as const, folders: (data.folders as Array<{ id: string; path: string; name: string; count: number }>) || [] };
}

export function canProxyPlay(title: { id: string; source?: string; path?: string }) {
  if (title.path || title.id.startsWith("node-")) return true;
  if (title.source === "plex" || title.source === "jellyfin") return true;
  return /^(plex|jf|jellyfin)-/.test(title.id);
}

export function nodeStreamUrl(base: string, token: string, id: string, connectionId?: string) {
  const url = new URL(`${normalizeNodeUrl(base)}/v1/stream`);
  url.searchParams.set("id", id);
  if (connectionId) url.searchParams.set("connectionId", connectionId);
  // NOTE: Token is NOT in the URL — it is passed via Authorization header instead
  // to prevent exposure in browser history, logs, and referrer headers.
  return { url: url.toString(), token };
}

export const INSTALLERS = [
  {
    id: "win",
    label: "Windows",
    arch: "x64",
    fileType: "ZIP archive",
    href: "/installers/CINEVO-Node-Windows-x64.zip",
    hint: "CINEVO icon · loopback exe",
    steps: ["Download and unzip", "Run CINEVO Node.exe", "Copy the pairing code"],
  },
  {
    id: "mac-arm",
    label: "macOS",
    arch: "Apple Silicon",
    fileType: "ZIP archive",
    href: "/installers/CINEVO-Node-macOS-Apple-Silicon.zip",
    hint: "CINEVO icon · drag to Applications",
    steps: ["Download and unzip", "Move Node to Applications", "Open and copy the code"],
  },
  {
    id: "mac-intel",
    label: "macOS",
    arch: "Intel",
    fileType: "ZIP archive",
    href: "/installers/CINEVO-Node-macOS-Intel.zip",
    hint: "CINEVO icon · drag to Applications",
    steps: ["Download and unzip", "Move Node to Applications", "Open and copy the code"],
  },
];

