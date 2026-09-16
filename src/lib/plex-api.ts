import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "./auth/middleware";
import { assertPublicProviderUrl } from "./provider-url";
import {
  parsePlexMetadata,
  parsePlexResources,
  parsePlexSections,
  rankConnections,
  type PlexServer,
} from "./plex";

function plexHeaders(clientId: string, token?: string) {
  return {
    Accept: "application/json",
    "X-Plex-Product": "CINEVO",
    "X-Plex-Client-Identifier": clientId,
    "X-Plex-Version": "1.0.0",
    "X-Plex-Platform": "Web",
    "X-Plex-Device": "Web",
    "X-Plex-Device-Name": "CINEVO",
    ...(token ? { "X-Plex-Token": token } : {}),
  };
}

function requireText(value: unknown, field: string, max = 512): string {
  if (typeof value !== "string") throw new Error(`Invalid ${field}`);
  const result = value.trim();
  if (!result || result.length > max) throw new Error(`Invalid ${field}`);
  return result;
}

function safeBaseUrl(value: unknown): string {
  const raw = requireText(value, "server URL");
  const url = new URL(raw);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error("Invalid server URL");
  return url.toString().replace(/\/$/, "");
}

function genericProviderError(fallback: string): string { return fallback; }

async function plexJson(url: string, headers: Record<string, string>, ms = 8000, init: RequestInit = {}): Promise<unknown> {
  const res = await fetch(url, {
    ...init,
    headers: { ...headers, ...(init.headers as Record<string, string> | undefined) },
    signal: AbortSignal.timeout(ms),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown> | unknown[];
  if (!res.ok) {
    const row = Array.isArray(data) ? {} : data;
    throw new Error(String(row.error || row.message || `Plex returned ${res.status}`));
  }
  return data;
}

export const plexStartPin = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { clientId: string }) => ({ clientId: requireText(input?.clientId, "client id", 160) }))
  .handler(async ({ data }) => {
    const clientId = data.clientId.trim();
    if (!clientId) return { ok: false as const, error: "Missing Plex client id." };
    try {
      const body = (await plexJson(
        "https://plex.tv/api/v2/pins?strong=true",
        plexHeaders(clientId),
        8000,
        { method: "POST" },
      )) as Record<string, unknown>;
      const id = Number(body.id);
      const code = String(body.code || "");
      if (!id || !code) return { ok: false as const, error: "Plex did not issue a sign-in pin." };
      return { ok: true as const, id, code };
    } catch (err) {
      return { ok: false as const, error: genericProviderError("Could not start Plex sign-in.") };
    }
  });

export const plexPollPin = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { clientId: string; pinId: number }) => {
    const pinId = Number(input?.pinId);
    if (!Number.isInteger(pinId) || pinId < 1) throw new Error("Invalid Plex pin");
    return { clientId: requireText(input?.clientId, "client id", 160), pinId };
  })
  .handler(async ({ data }) => {
    try {
      const body = (await plexJson(
        `https://plex.tv/api/v2/pins/${data.pinId}`,
        plexHeaders(data.clientId),
        6000,
      )) as Record<string, unknown>;
      const token = typeof body.authToken === "string" ? body.authToken : "";
      return { ok: true as const, token: token || null };
    } catch (err) {
      return { ok: false as const, error: genericProviderError("Plex sign-in timed out.") };
    }
  });

export const plexListServers = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { clientId: string; token: string }) => ({
    clientId: requireText(input?.clientId, "client id", 160),
    token: requireText(input?.token, "token", 512),
  }))
  .handler(async ({ data }) => {
    const headers = plexHeaders(data.clientId, data.token);
    try {
      const [userRaw, resources] = await Promise.all([
        plexJson("https://plex.tv/api/v2/user", headers),
        plexJson("https://plex.tv/api/v2/resources?includeHttps=1&includeRelay=1", headers),
      ]);
      const user = userRaw as Record<string, unknown>;
      const servers = parsePlexResources(resources);
      return {
        ok: true as const,
        username: String(user.username || user.title || user.email || "Plex"),
        servers,
      };
    } catch (err) {
      return { ok: false as const, error: genericProviderError("Could not list Plex servers.") };
    }
  });

export const plexOpenServer = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { clientId: string; token: string; server: PlexServer }) => {
    const clientId = requireText(input?.clientId, "client id", 160);
    const token = requireText(input?.token, "token", 512);
    if (!input?.server || !Array.isArray(input.server.connections)) throw new Error("Invalid Plex server");
    const server = { ...input.server, connections: input.server.connections.slice(0, 12).map((connection) => ({ ...connection, uri: safeBaseUrl(connection.uri) })) };
    return { clientId, token, server };
  })
  .handler(async ({ data }) => {
    const token = data.server.accessToken || data.token;
    const ranked = [];
    for (const connection of rankConnections(data.server.connections)) {
      try { ranked.push({ ...connection, uri: await assertPublicProviderUrl(connection.uri) }); } catch { /* skip unsafe provider targets */ }
    }
    if (!ranked.length) return { ok: false as const, error: "That server has no reachable connections." };
    let last = "Could not reach that Plex server from here.";
    for (const conn of ranked) {
      try {
        const body = await plexJson(
          `${conn.uri}/library/sections`,
          { ...plexHeaders(data.clientId, token), "X-Plex-Token": token },
          conn.local ? 2500 : 6000,
        );
        const sections = parsePlexSections(body);
        return {
          ok: true as const,
          uri: conn.uri,
          kind: conn.relay ? "relay" : conn.local ? "local" : "remote",
          sections,
        };
      } catch (err) {
        last = genericProviderError("Could not reach that Plex server from here.");
      }
    }
    return { ok: false as const, error: last };
  });

export const plexImportSections = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { clientId: string; token: string; uri: string; sourceLabel: string; sectionKeys: string[] }) => {
    const sectionKeys = Array.isArray(input?.sectionKeys) ? input.sectionKeys.slice(0, 12).map((key) => requireText(key, "section", 120)) : [];
    if (!sectionKeys.length) throw new Error("Select at least one library");
    return { clientId: requireText(input?.clientId, "client id", 160), token: requireText(input?.token, "token", 512), uri: safeBaseUrl(input?.uri), sourceLabel: requireText(input?.sourceLabel, "source label", 120), sectionKeys };
  })
  .handler(async ({ data }) => {
    const uri = await assertPublicProviderUrl(data.uri);
    const headers = { ...plexHeaders(data.clientId, data.token), "X-Plex-Token": data.token };
    const titles: ReturnType<typeof parsePlexMetadata> = [];
    try {
      for (const key of data.sectionKeys.slice(0, 12)) {
        const body = await plexJson(
          `${data.uri}/library/sections/${encodeURIComponent(key)}/all?X-Plex-Container-Start=0&X-Plex-Container-Size=80`,
          headers,
          12000,
        );
        titles.push(...parsePlexMetadata(body, data.sourceLabel));
      }
      const seen = new Set<string>();
      const unique = titles.filter((t) => (seen.has(t.id) ? false : (seen.add(t.id), true)));
      return { ok: true as const, titles: unique };
    } catch (err) {
      return { ok: false as const, error: genericProviderError("Could not import that Plex library.") };
    }
  });
