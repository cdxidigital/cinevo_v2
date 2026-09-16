import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "./auth/middleware";
import { assertPublicProviderUrl } from "./provider-url";

function requireText(value: unknown, field: string, max = 512): string {
  if (typeof value !== "string") throw new Error(`Invalid ${field}`);
  const result = value.trim();
  if (!result || result.length > max) throw new Error(`Invalid ${field}`);
  return result;
}

function genericProviderError(fallback: string): string { return fallback; }

type JellyfinItem = {
  Id?: string;
  Name?: string;
  Type?: string;
  ProductionYear?: number;
  PremiereDate?: string;
  Overview?: string;
  Genres?: string[];
  CommunityRating?: number;
  CollectionType?: string;
};

function authHeader(deviceId: string, token?: string) {
  const parts = [
    `Client="CINEVO"`,
    `Device="Web"`,
    `DeviceId="${deviceId}"`,
    `Version="1.0.0"`,
  ];
  if (token) parts.push(`Token="${token}"`);
  return `MediaBrowser ${parts.join(", ")}`;
}

async function jfFetch(url: string, headers: Record<string, string>, init: RequestInit = {}, ms = 10000) {
  const res = await fetch(url, {
    ...init,
    headers: { ...headers, ...(init.headers as Record<string, string> | undefined) },
    signal: AbortSignal.timeout(ms),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) throw new Error("Jellyfin could not verify those details.");
    throw new Error(String(data.message || data.error || `Jellyfin returned ${res.status}`));
  }
  return data;
}

function normalizeBase(value: unknown) {
  const raw = requireText(value, "server URL");
  const url = new URL(raw);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) throw new Error("Invalid server URL");
  return url.toString().replace(/\/$/, "");
}

export const jellyfinConnect = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { baseUrl: string; username: string; password: string; clientId: string }) => ({
    baseUrl: normalizeBase(input?.baseUrl), username: requireText(input?.username, "username", 160), password: requireText(input?.password, "password", 512), clientId: requireText(input?.clientId, "client id", 160),
  }))
  .handler(async ({ data }) => {
    const baseUrl = await assertPublicProviderUrl(normalizeBase(data.baseUrl));
    const deviceId = data.clientId.trim() || "cinevo-web";
    try {
      const body = await jfFetch(
        `${baseUrl}/Users/AuthenticateByName`,
        {
          "Content-Type": "application/json",
          "X-Emby-Authorization": authHeader(deviceId),
        },
        { method: "POST", body: JSON.stringify({ Username: data.username.trim(), Pw: data.password }) },
        12000,
      );
      const user = (body.User ?? {}) as { Id?: string; Name?: string };
      const token = String(body.AccessToken || "");
      if (!token || !user.Id) return { ok: false as const, error: "Jellyfin did not return a usable session." };
      return {
        ok: true as const,
        token,
        userId: String(user.Id),
        username: String(user.Name || data.username),
        baseUrl,
      };
    } catch (err) {
      return {
        ok: false as const,
        error: genericProviderError("Could not reach that Jellyfin library from here."),
      };
    }
  });

export const jellyfinListSections = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { baseUrl: string; token: string; userId: string; clientId: string }) => ({
    baseUrl: normalizeBase(input?.baseUrl), token: requireText(input?.token, "token", 512), userId: requireText(input?.userId, "user id", 160), clientId: requireText(input?.clientId, "client id", 160),
  }))
  .handler(async ({ data }) => {
    const baseUrl = await assertPublicProviderUrl(normalizeBase(data.baseUrl));
    try {
      const body = await jfFetch(
        `${baseUrl}/Users/${encodeURIComponent(data.userId)}/Views`,
        { "X-Emby-Authorization": authHeader(data.clientId, data.token) },
      );
      const items = (Array.isArray(body.Items) ? body.Items : []) as JellyfinItem[];
      const sections = items
        .filter((item) => {
          const kind = String(item.CollectionType || item.Type || "").toLowerCase();
          return kind.includes("movie") || kind.includes("tv") || kind.includes("series") || !kind;
        })
        .map((item) => ({
          key: String(item.Id || ""),
          title: String(item.Name || "Library"),
          type: String(item.CollectionType || item.Type || ""),
        }))
        .filter((s) => s.key);
      return { ok: true as const, sections };
    } catch (err) {
      return {
        ok: false as const,
        error: genericProviderError("Could not list Jellyfin libraries."),
      };
    }
  });

export const jellyfinImportSections = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { baseUrl: string; token: string; userId: string; clientId: string; sourceLabel: string; sectionKeys: string[] }) => {
    const sectionKeys = Array.isArray(input?.sectionKeys) ? input.sectionKeys.slice(0, 12).map((key) => requireText(key, "section", 120)) : [];
    if (!sectionKeys.length) throw new Error("Select at least one library");
    return { baseUrl: normalizeBase(input?.baseUrl), token: requireText(input?.token, "token", 512), userId: requireText(input?.userId, "user id", 160), clientId: requireText(input?.clientId, "client id", 160), sourceLabel: requireText(input?.sourceLabel, "source label", 120), sectionKeys };
  })
  .handler(async ({ data }) => {
    const baseUrl = await assertPublicProviderUrl(normalizeBase(data.baseUrl));
    const headers = { "X-Emby-Authorization": authHeader(data.clientId, data.token) };
    const titles: {
      id: string;
      title: string;
      year: string;
      kind: "movie" | "series";
      synopsis: string;
      genre: string;
      sourceLabel: string;
    }[] = [];
    try {
      for (const key of data.sectionKeys.slice(0, 12)) {
        const params = new URLSearchParams({
          ParentId: key,
          IncludeItemTypes: "Movie,Series",
          Recursive: "true",
          Fields: "Overview,Genres,ProductionYear,PremiereDate,CommunityRating",
          Limit: "80",
          SortBy: "DateCreated",
          SortOrder: "Descending",
        });
        const body = await jfFetch(
          `${baseUrl}/Users/${encodeURIComponent(data.userId)}/Items?${params}`,
          headers,
          {},
          12000,
        );
        const items = (Array.isArray(body.Items) ? body.Items : []) as JellyfinItem[];
        for (const item of items.slice(0, 80)) {
          const genres = Array.isArray(item.Genres) ? item.Genres.filter(Boolean) : [];
          titles.push({
            id: `jellyfin-${item.Id || item.Name}`,
            title: String(item.Name || "Untitled"),
            year: item.ProductionYear ? String(item.ProductionYear) : String(item.PremiereDate || "").slice(0, 4),
            kind: String(item.Type || "") === "Series" ? "series" : "movie",
            synopsis: String(item.Overview || ""),
            genre: genres[0] || "Jellyfin",
            sourceLabel: data.sourceLabel,
          });
        }
      }
      const seen = new Set<string>();
      const unique = titles.filter((t) => (seen.has(t.id) ? false : (seen.add(t.id), true)));
      return { ok: true as const, titles: unique };
    } catch (err) {
      return {
        ok: false as const,
        error: genericProviderError("Could not import that Jellyfin library."),
      };
    }
  });
