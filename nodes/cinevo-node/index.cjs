#!/usr/bin/env node
"use strict";

/* eslint-disable @typescript-eslint/no-require-imports -- packaged Node entrypoint is CommonJS. */
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const crypto = require("node:crypto");
const { Readable } = require("node:stream");
const { exec } = require("node:child_process");

const VERSION = "0.3.0";
const HOST = "127.0.0.1";
const PORT = Number(process.env.CINEVO_NODE_PORT || 48184);
const CODE_TTL_MS = 10 * 60 * 1000;
const SESSION_TTL_MS = 4 * 60 * 60 * 1000;

function configDir() {
  const home = os.homedir();
  if (process.platform === "darwin") {
    return path.join(home, "Library", "Application Support", "CINEVO Node");
  }
  if (process.platform === "win32") {
    return path.join(process.env.LOCALAPPDATA || home, "CINEVO", "Node");
  }
  return path.join(home, ".config", "cinevo-node");
}

function configPath() {
  return path.join(configDir(), "config.json");
}

function loadConfig() {
  try {
    return JSON.parse(fs.readFileSync(configPath(), "utf8"));
  } catch {
    return {
      deviceId: `cn-${crypto.randomBytes(6).toString("hex")}`,
      connections: [],
      selectedLibraries: [],
      folders: [],
    };
  }
}

function saveConfig(cfg) {
  const dir = configDir();
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  fs.writeFileSync(configPath(), JSON.stringify(cfg, null, 2), { mode: 0o600 });
}

function makeCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let raw = "";
  for (let i = 0; i < 6; i++) raw += alphabet[crypto.randomInt(alphabet.length)];
  return `${raw.slice(0, 3)}-${raw.slice(3)}`;
}

function normCode(value) {
  return String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

const state = {
  config: loadConfig(),
  code: makeCode(),
  codeExpires: Date.now() + CODE_TTL_MS,
  sessions: new Map(),
};

saveConfig(state.config);

function rotateCode() {
  state.code = makeCode();
  state.codeExpires = Date.now() + CODE_TTL_MS;
}

function publicStatus() {
  return {
    deviceId: state.config.deviceId,
    version: VERSION,
    connections: (state.config.connections || []).map((c) => ({
      id: c.id,
      provider: c.provider,
      baseUrl: c.baseUrl,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    })),
    selectedLibraries: state.config.selectedLibraries || [],
    folders: (state.config.folders || []).map((f) => ({
      id: f.id,
      path: f.path,
      name: f.name,
      count: f.count || 0,
    })),
    pairingCodeExpiresAt: new Date(state.codeExpires).toISOString(),
  };
}

function send(res, status, body, extra = {}) {
  const payload = typeof body === "string" ? body : JSON.stringify(body);
  const headers = {
    "Content-Type": typeof body === "string" ? "text/html; charset=utf-8" : "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Authorization, Content-Type, Range",
    "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
    "Access-Control-Expose-Headers": "Accept-Ranges, Content-Length, Content-Range, Content-Type",
    "Access-Control-Allow-Private-Network": "true",
    ...extra,
  };
  res.writeHead(status, headers);
  res.end(payload);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (c) => {
      size += c.length;
      if (size > 1_000_000) {
        reject(new Error("payload too large"));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error("invalid json"));
      }
    });
    req.on("error", reject);
  });
}

function bearer(req) {
  const h = req.headers.authorization || "";
  const m = /^Bearer\s+(.+)$/i.exec(h);
  return m ? m[1].trim() : "";
}

function requireSession(req, res) {
  const token = bearer(req);
  const session = token ? state.sessions.get(token) : null;
  if (!session || session.expires < Date.now()) {
    send(res, 401, { error: "The local pairing session expired" });
    return null;
  }
  return session;
}

function brandPng() {
  const candidates = [
    path.join(__dirname, "brand", "icon-256.png"),
    path.join(process.cwd(), "brand", "icon-256.png"),
  ];
  for (const file of candidates) {
    try {
      if (fs.existsSync(file)) return fs.readFileSync(file);
    } catch {
      /* ignore */
    }
  }
  return null;
}

function dashboardHtml() {
  const code = Date.now() > state.codeExpires ? (rotateCode(), state.code) : state.code;
  const mins = Math.max(1, Math.round((state.codeExpires - Date.now()) / 60000));
  const conns = (state.config.connections || [])
    .map(
      (c) =>
        `<li><b>${escapeHtml(c.provider)}</b> <span>${escapeHtml(c.baseUrl)}</span></li>`,
    )
    .join("") || "<li class='empty'>No media servers yet. Add Plex or Jellyfin below — tokens stay on this computer.</li>";
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>CINEVO Node</title>
  <link rel="icon" href="/icon.png" />
  <link rel="apple-touch-icon" href="/icon.png" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
  <style>
    :root { --bg:#0b0b0b; --elev:#141414; --cyan:#3b7bff; --text:#f5f5f5; --muted:#a3a3a3; --line:rgba(255,255,255,.12); }
    * { box-sizing: border-box; }
    body { margin:0; background:var(--bg); color:var(--text); font-family: Inter, system-ui, sans-serif; }
    header { display:flex; justify-content:space-between; align-items:center; gap:16px; padding:20px 28px; border-bottom:1px solid var(--line); }
    .brand { display:flex; align-items:center; gap:10px; font-weight:800; letter-spacing:.12em; font-size:14px; }
    .brand img { width:28px; height:28px; border-radius:7px; }
    main { max-width:720px; margin:0 auto; padding:40px 24px 80px; }
    h1 { font-size:32px; letter-spacing:-.04em; margin:8px 0 12px; }
    p { color: var(--muted); line-height:1.6; }
    .code { font-size:42px; font-weight:800; letter-spacing:.18em; color:var(--cyan); margin:12px 0; }
    .card { border:1px solid var(--line); background:var(--elev); border-radius:16px; padding:20px; margin:18px 0; }
    label { display:block; font-size:11px; letter-spacing:.18em; text-transform:uppercase; color:var(--muted); margin:10px 0 6px; }
    input { width:100%; height:44px; border-radius:8px; border:1px solid var(--line); background:#111; color:var(--text); padding:0 12px; font-family:inherit; }
    button { height:44px; border:0; border-radius:8px; background:var(--cyan); color:#fff; font-family:inherit; font-weight:700; letter-spacing:.06em; padding:0 16px; cursor:pointer; }
    button.ghost { background:transparent; color:var(--cyan); border:1px solid var(--cyan); }
    ul { list-style:none; padding:0; }
    li { display:flex; justify-content:space-between; gap:12px; padding:10px 0; border-bottom:1px solid var(--line); font-size:14px; }
    .empty { color:var(--muted); }
    .row { display:flex; gap:8px; flex-wrap:wrap; margin-top:12px; }
  </style>
</head>
<body>
  <header>
    <div class="brand"><img src="/icon.png" alt="" />CINEVO NODE</div>
    <small>${escapeHtml(state.config.deviceId)} · v${VERSION} · 127.0.0.1:${PORT}</small>
  </header>
  <main>
    <p>PRIVATE COMPANION</p>
    <h1>Loopback only.</h1>
    <p>This process never leaves your machine. Pair CINEVO with the code below. It expires in about ${mins} minutes. Playback is proxied from here — tokens never go to CINEVO.</p>
    <div class="card">
      <label>PAIRING CODE</label>
      <div class="code">${escapeHtml(code)}</div>
      <p>Enter this in CINEVO on the same computer. Credentials for Plex or Jellyfin stay here.</p>
      <div class="row">
        <form method="post" action="/v1/code/rotate"><button class="ghost" type="submit">New code</button></form>
      </div>
    </div>
    <div class="card">
      <label>CONNECTED SERVERS</label>
      <ul>${conns}</ul>
      <form method="post" action="/v1/connections" onsubmit="return pack(this)">
        <input type="hidden" name="payload" />
        <label>PROVIDER</label>
        <input name="provider" placeholder="plex, jellyfin, or preview" />
        <label>BASE URL</label>
        <input name="baseUrl" placeholder="http://127.0.0.1:32400" />
        <label>TOKEN / PASSWORD</label>
        <input name="secret" type="password" placeholder="Plex token or Jellyfin password" />
        <label>USERNAME (Jellyfin)</label>
        <input name="username" placeholder="optional" />
        <div class="row"><button type="submit">Save locally</button></div>
      </form>
    </div>
  </main>
  <script>
    function pack(form) {
      const data = {
        provider: form.provider.value.trim().toLowerCase() || "preview",
        baseUrl: form.baseUrl.value.trim() || "local://preview",
        token: form.secret.value,
        username: form.username.value,
        password: form.secret.value
      };
      form.payload.value = JSON.stringify(data);
      fetch("/v1/connections", { method: "POST", headers: { "Content-Type": "application/json", "X-Cinevo-Local": "dashboard" }, body: JSON.stringify(data) })
        .then(() => location.reload());
      return false;
    }
  </script>
</body>
</html>`;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&" + "amp;")
    .replace(/</g, "&" + "lt;")
    .replace(/>/g, "&" + "gt;")
    .replace(/"/g, "&" + "quot;");
}

function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h.toString(16);
}

const VIDEO_RE = /\.(mp4|mkv|mov|avi|webm|m4v|wmv|ts|m2ts)$/i;

function walkVideos(dir, acc, depth) {
  if (depth > 6 || acc.length >= 80) return;
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (acc.length >= 80) return;
    if (entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkVideos(full, acc, depth + 1);
    else if (VIDEO_RE.test(entry.name)) acc.push({ name: entry.name, path: full });
  }
}

function prettyName(fileName) {
  let stem = fileName.replace(VIDEO_RE, "");
  stem = stem
    .replace(/[._]+/g, " ")
    .replace(/\((?:19|20)\d{2}\)/g, " ")
    .replace(/\b(?:19|20)\d{2}\b/g, " ")
    .replace(/\b(1080p|720p|2160p|4k|bluray|webrip|x264|x265)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return stem || fileName;
}

function yearOf(fileName) {
  const m = /\(?((?:19|20)\d{2})\)?/.exec(fileName);
  return m ? m[1] : "";
}

const MIME = {
  ".mp4": "video/mp4",
  ".m4v": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".mkv": "video/x-matroska",
  ".avi": "video/x-msvideo",
  ".ts": "video/mp2t",
  ".m2ts": "video/mp2t",
  ".wmv": "video/x-ms-wmv",
};

function mimeFor(filePath) {
  return MIME[path.extname(filePath).toLowerCase()] || "application/octet-stream";
}

function streamCors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Authorization, Content-Type, Range",
    "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
    "Access-Control-Expose-Headers": "Accept-Ranges, Content-Length, Content-Range, Content-Type",
    "Access-Control-Allow-Private-Network": "true",
    "Cache-Control": "no-store",
  };
}

function isInside(parent, child) {
  const rel = path.relative(parent, child);
  return Boolean(rel) && !rel.startsWith("..") && !path.isAbsolute(rel);
}

function parseRange(header, size) {
  if (!header || !size) return null;
  const m = /^bytes=(\d*)-(\d*)$/i.exec(String(header).trim());
  if (!m) return null;
  let start;
  let end;
  if (m[1] === "" && m[2]) {
    const suffix = Number(m[2]);
    if (!Number.isFinite(suffix) || suffix <= 0) return null;
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = m[1] ? Number(m[1]) : 0;
    end = m[2] ? Number(m[2]) : size - 1;
  }
  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || start >= size || start > end) return null;
  return { start, end: Math.min(end, size - 1) };
}

function sessionFrom(req, url) {
  const token = bearer(req) || String(url.searchParams.get("token") || "");
  const session = token ? state.sessions.get(token) : null;
  if (!session || session.expires < Date.now()) return null;
  return session;
}

function indexFolderFiles(folder) {
  if (Array.isArray(folder.files) && folder.files.length) return folder.files;
  if (!folder.path) return [];
  const acc = [];
  walkVideos(folder.path, acc, 0);
  folder.files = acc.map((f) => ({
    id: `node-${hashStr(f.path)}`,
    path: f.path,
    name: f.name,
  }));
  saveConfig(state.config);
  return folder.files;
}

function findLocalFile(id) {
  for (const folder of state.config.folders || []) {
    const hit = indexFolderFiles(folder).find((f) => f.id === id);
    if (!hit) continue;
    try {
      const root = fs.realpathSync(folder.path);
      const file = fs.realpathSync(hit.path);
      if (!isInside(root, file)) continue;
      if (!fs.statSync(file).isFile()) continue;
      return file;
    } catch {
      /* missing or escaped path */
    }
  }
  return null;
}

function remoteKeyFromId(id) {
  const plex = /^plex-(.+)$/.exec(id);
  if (plex) return { provider: "plex", key: plex[1] };
  const jf = /^(?:jf|jellyfin)-(.+)$/.exec(id);
  if (jf) return { provider: "jellyfin", key: jf[1] };
  return null;
}

function connectionsFor(provider, connectionId) {
  const all = state.config.connections || [];
  if (connectionId) {
    const hit = all.find((c) => c.id === connectionId);
    return hit ? [hit] : [];
  }
  return all.filter((c) => c.provider === provider);
}

function streamLocalFile(req, res, filePath) {
  const stat = fs.statSync(filePath);
  const size = stat.size;
  const type = mimeFor(filePath);
  const cors = streamCors();
  if (req.method === "HEAD") {
    res.writeHead(200, { ...cors, "Content-Type": type, "Content-Length": size, "Accept-Ranges": "bytes" });
    res.end();
    return;
  }
  const range = parseRange(req.headers.range, size);
  if (range) {
    const length = range.end - range.start + 1;
    res.writeHead(206, {
      ...cors,
      "Content-Type": type,
      "Content-Length": length,
      "Content-Range": `bytes ${range.start}-${range.end}/${size}`,
      "Accept-Ranges": "bytes",
    });
    const stream = fs.createReadStream(filePath, { start: range.start, end: range.end });
    stream.on("error", () => {
      if (!res.writableEnded) res.end();
    });
    req.on("close", () => stream.destroy());
    stream.pipe(res);
    return;
  }
  res.writeHead(200, { ...cors, "Content-Type": type, "Content-Length": size, "Accept-Ranges": "bytes" });
  const stream = fs.createReadStream(filePath);
  stream.on("error", () => {
    if (!res.writableEnded) res.end();
  });
  req.on("close", () => stream.destroy());
  stream.pipe(res);
}

async function plexPlayUrl(conn, ratingKey) {
  const data = await fetchJson(`${conn.baseUrl}/library/metadata/${encodeURIComponent(ratingKey)}`, {
    Accept: "application/json",
    "X-Plex-Token": conn.token,
  });
  const meta = (((data.MediaContainer || {}).Metadata) || [])[0] || {};
  const media = (meta.Media || [])[0] || {};
  const part = (media.Part || [])[0] || {};
  const container = String(part.container || media.container || "").toLowerCase();
  const key = String(part.key || "");
  const friendly = ["mp4", "mov", "m4v", "webm"].includes(container);
  if (key && friendly) {
    const href = key.startsWith("http") ? key : `${conn.baseUrl}${key}`;
    const target = new URL(href);
    target.searchParams.set("X-Plex-Token", conn.token);
    return { url: target.toString(), headers: { "X-Plex-Token": conn.token } };
  }
  const session = crypto.randomBytes(8).toString("hex");
  const params = new URLSearchParams({
    path: `/library/metadata/${ratingKey}`,
    mediaIndex: "0",
    partIndex: "0",
    protocol: "http",
    fastSeek: "1",
    directPlay: "0",
    directStream: "1",
    directStreamAudio: "1",
    subtitleSize: "100",
    audioBoost: "100",
    location: "lan",
    session,
    "X-Plex-Platform": "Chrome",
    "X-Plex-Client-Identifier": "cinevo-node",
    "X-Plex-Product": "CINEVO",
    "X-Plex-Device": "Node",
    "X-Plex-Token": conn.token,
  });
  return {
    url: `${conn.baseUrl}/video/:/transcode/universal/start.mp4?${params}`,
    headers: { "X-Plex-Token": conn.token, Accept: "video/mp4" },
  };
}

async function jellyPlayUrl(conn, itemId) {
  await jellyLogin(conn);
  return {
    url: `${conn.baseUrl}/Videos/${encodeURIComponent(itemId)}/stream.mp4?static=false`,
    headers: { "X-Emby-Token": conn.accessToken },
  };
}

async function proxyUpstream(req, res, url, headers) {
  const ac = new AbortController();
  const onClose = () => ac.abort();
  req.on("close", onClose);
  const hdrs = { ...headers };
  if (req.headers.range) hdrs.Range = req.headers.range;
  let upstream;
  try {
    upstream = await fetch(url, { headers: hdrs, signal: ac.signal, redirect: "follow" });
  } catch (err) {
    req.off("close", onClose);
    if (ac.signal.aborted) return;
    send(res, 502, { error: err instanceof Error ? err.message : "Upstream stream failed" });
    return;
  }
  if (!upstream.ok && upstream.status !== 206) {
    req.off("close", onClose);
    const errText = await upstream.text().catch(() => "");
    send(res, 502, { error: errText.slice(0, 200) || `Media server returned ${upstream.status}` });
    return;
  }
  const out = streamCors();
  out["Content-Type"] = upstream.headers.get("content-type") || "video/mp4";
  out["Accept-Ranges"] = upstream.headers.get("accept-ranges") || "bytes";
  const length = upstream.headers.get("content-length");
  const contentRange = upstream.headers.get("content-range");
  if (length) out["Content-Length"] = length;
  if (contentRange) out["Content-Range"] = contentRange;
  const status = upstream.status === 206 ? 206 : 200;
  if (req.method === "HEAD" || !upstream.body) {
    req.off("close", onClose);
    res.writeHead(status, out);
    res.end();
    return;
  }
  res.writeHead(status, out);
  const nodeStream = Readable.fromWeb(upstream.body);
  nodeStream.on("error", () => {
    if (!res.writableEnded) res.end();
  });
  req.on("close", () => nodeStream.destroy());
  nodeStream.pipe(res);
}

async function fetchJson(url, headers) {
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(8000) });
  const text = await res.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = {};
  }
  if (!res.ok) {
    throw new Error(data.error || data.message || `Server returned ${res.status}`);
  }
  return data;
}

async function jellyAuth(conn) {
  if (conn.accessToken && conn.userId) return conn;
  const data = await fetchJson(`${conn.baseUrl}/Users/AuthenticateByName`, {
    "Content-Type": "application/json",
    "X-Emby-Authorization":
      'MediaBrowser Client="CINEVO", Device="Node", DeviceId="cinevo-node", Version="0.1.0"',
  });
  // AuthenticateByName needs POST body — handle separately
  return conn;
}

async function jellyLogin(conn) {
  const res = await fetch(`${conn.baseUrl}/Users/AuthenticateByName`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Emby-Authorization":
        'MediaBrowser Client="CINEVO", Device="Node", DeviceId="cinevo-node", Version="0.1.0"',
    },
    body: JSON.stringify({ Username: conn.username, Pw: conn.token }),
    signal: AbortSignal.timeout(8000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.Message || "Jellyfin login failed");
  conn.accessToken = data.AccessToken;
  conn.userId = data.User && data.User.Id;
  saveConfig(state.config);
  return conn;
}

async function listSections(conn) {
  if (conn.provider === "preview") {
    return [{ key: "preview", title: "Preview catalog", type: "movie" }];
  }
  if (conn.provider === "plex") {
    const data = await fetchJson(`${conn.baseUrl}/library/sections`, {
      Accept: "application/json",
      "X-Plex-Token": conn.token,
    });
    const dirs = (((data.MediaContainer || {}).Directory) || []).map((d) => ({
      key: String(d.key),
      title: d.title,
      type: d.type,
    }));
    return dirs;
  }
  if (conn.provider === "jellyfin") {
    await jellyLogin(conn);
    const data = await fetchJson(`${conn.baseUrl}/Users/${conn.userId}/Views`, {
      "X-Emby-Token": conn.accessToken,
    });
    return (data.Items || []).map((d) => ({
      key: d.Id,
      title: d.Name,
      type: d.CollectionType || d.Type,
    }));
  }
  return [];
}

async function importSections(conn, keys) {
  if (conn.provider === "preview") {
    return [{ id: "preview-1", title: "Preview title", year: "2026", kind: "movie", sourceLabel: "Preview" }];
  }
  const wanted = new Set(keys.map(String));
  const titles = [];
  if (conn.provider === "plex") {
    for (const key of wanted) {
      const data = await fetchJson(`${conn.baseUrl}/library/sections/${key}/all?X-Plex-Container-Start=0&X-Plex-Container-Size=40`, {
        Accept: "application/json",
        "X-Plex-Token": conn.token,
      });
      const meta = ((data.MediaContainer || {}).Metadata) || [];
      for (const item of meta.slice(0, 40)) {
        titles.push({
          id: `plex-${item.ratingKey || hashStr(item.title)}`,
          title: item.title,
          year: String(item.year || ""),
          kind: item.type === "show" ? "series" : "movie",
          synopsis: item.summary || "",
          genre: ((item.Genre || [])[0] || {}).tag || "Plex",
          sourceLabel: conn.baseUrl,
          connectionId: conn.id,
        });
      }
    }
  }
  if (conn.provider === "jellyfin") {
    await jellyLogin(conn);
    for (const key of wanted) {
      const data = await fetchJson(
        `${conn.baseUrl}/Items?ParentId=${encodeURIComponent(key)}&IncludeItemTypes=Movie,Series&Recursive=true&Limit=40`,
        { "X-Emby-Token": conn.accessToken },
      );
      for (const item of data.Items || []) {
        titles.push({
          id: `jf-${item.Id}`,
          title: item.Name,
          year: String((item.ProductionYear) || ""),
          kind: item.Type === "Series" ? "series" : "movie",
          synopsis: item.Overview || "",
          genre: (item.Genres && item.Genres[0]) || "Jellyfin",
          sourceLabel: conn.baseUrl,
          connectionId: conn.id,
        });
      }
    }
  }
  return titles;
}

async function handle(req, res) {
  const url = new URL(req.url || "/", `http://${HOST}:${PORT}`);
  if (req.method === "OPTIONS") {
    send(res, 204, "");
    return;
  }

  if (req.method === "GET" && url.pathname === "/health") {
    send(res, 200, {
      ok: true,
      version: VERSION,
      deviceId: state.config.deviceId,
      loopback: true,
      playback: true,
      port: PORT,
    });
    return;
  }

  if (req.method === "GET" && (url.pathname === "/icon.png" || url.pathname === "/favicon.ico")) {
    const png = brandPng();
    if (!png) {
      send(res, 404, { error: "Icon missing" });
      return;
    }
    res.writeHead(200, {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400",
      "Access-Control-Allow-Origin": "*",
    });
    res.end(png);
    return;
  }

  if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/dashboard")) {
    send(res, 200, dashboardHtml());
    return;
  }

  if (req.method === "POST" && url.pathname === "/v1/code/rotate") {
    rotateCode();
    send(res, 302, "", { Location: "/" });
    return;
  }

  if (req.method === "POST" && url.pathname === "/v1/pair") {
    let body;
    try {
      body = await readBody(req);
    } catch (e) {
      send(res, 400, { error: e.message });
      return;
    }
    if (Date.now() > state.codeExpires) rotateCode();
    const code = normCode(body.code);
    if (!code || code !== normCode(state.code)) {
      send(res, 401, { error: "Pairing was not accepted" });
      return;
    }
    const token = crypto.randomBytes(24).toString("hex");
    const expires = Date.now() + SESSION_TTL_MS;
    state.sessions.set(token, { expires, createdAt: Date.now() });
    rotateCode();
    send(res, 200, { token, expiresAt: new Date(expires).toISOString(), deviceId: state.config.deviceId });
    return;
  }

  if (req.method === "GET" && url.pathname === "/v1/status") {
    if (!requireSession(req, res)) return;
    send(res, 200, publicStatus());
    return;
  }

  if (req.method === "POST" && url.pathname === "/v1/connections") {
    const localDash = req.headers["x-cinevo-local"] === "dashboard";
    if (!localDash && !requireSession(req, res)) return;
    let body;
    try {
      body = await readBody(req);
    } catch (e) {
      send(res, 400, { error: e.message });
      return;
    }
    const provider = String(body.provider || "preview").toLowerCase();
    if (!["plex", "jellyfin", "preview"].includes(provider)) {
      send(res, 400, { error: "Unknown provider" });
      return;
    }
    const now = new Date().toISOString();
    const conn = {
      id: `conn-${crypto.randomBytes(4).toString("hex")}`,
      provider,
      baseUrl: String(body.baseUrl || (provider === "preview" ? "local://preview" : "")).replace(/\/$/, ""),
      token: String(body.token || body.password || ""),
      username: String(body.username || ""),
      createdAt: now,
      updatedAt: now,
    };
    if (provider !== "preview" && !conn.baseUrl) {
      send(res, 400, { error: "A local server address is required" });
      return;
    }
    state.config.connections.push(conn);
    saveConfig(state.config);
    send(res, 200, { id: conn.id, provider: conn.provider, baseUrl: conn.baseUrl });
    return;
  }

  if (req.method === "POST" && url.pathname === "/v1/connections/revoke") {
    if (!requireSession(req, res)) return;
    let body;
    try {
      body = await readBody(req);
    } catch (e) {
      send(res, 400, { error: e.message });
      return;
    }
    const id = String(body.connectionId || "");
    state.config.connections = (state.config.connections || []).filter((c) => c.id !== id);
    saveConfig(state.config);
    send(res, 200, { ok: true });
    return;
  }

  if (url.pathname === "/v1/folders" && req.method === "GET") {
    if (!requireSession(req, res)) return;
    send(res, 200, {
      folders: (state.config.folders || []).map((f) => ({
        id: f.id,
        path: f.path,
        name: f.name,
        count: f.count || 0,
      })),
    });
    return;
  }

  if (url.pathname === "/v1/folders" && req.method === "POST") {
    if (!requireSession(req, res)) return;
    let body;
    try {
      body = await readBody(req);
    } catch (e) {
      send(res, 400, { error: e.message });
      return;
    }
    const folderPath = String(body.path || "").trim();
    if (!folderPath) {
      send(res, 400, { error: "Choose a folder path" });
      return;
    }
    if (folderPath.includes("\0") || folderPath === "/") {
      send(res, 400, { error: "That path is not allowed" });
      return;
    }
    let stat;
    try {
      stat = fs.statSync(folderPath);
    } catch {
      send(res, 400, { error: "CINEVO Node could not open that folder" });
      return;
    }
    if (!stat.isDirectory()) {
      send(res, 400, { error: "That path is not a folder" });
      return;
    }
    const files = [];
    walkVideos(folderPath, files, 0);
    const name = path.basename(folderPath);
    const indexed = files.map((f) => ({
      id: `node-${hashStr(f.path)}`,
      path: f.path,
      name: f.name,
    }));
    const folder = {
      id: `folder-${crypto.randomBytes(4).toString("hex")}`,
      path: folderPath,
      name,
      count: files.length,
      files: indexed,
    };
    state.config.folders = state.config.folders || [];
    state.config.folders.push(folder);
    saveConfig(state.config);
    send(res, 200, {
      id: folder.id,
      name,
      count: files.length,
      titles: indexed.map((f) => ({
        id: f.id,
        title: prettyName(f.name),
        year: yearOf(f.name),
        path: f.path,
      })),
    });
    return;
  }

  if (url.pathname === "/v1/sections" && req.method === "POST") {
    if (!requireSession(req, res)) return;
    let body;
    try {
      body = await readBody(req);
    } catch (e) {
      send(res, 400, { error: e.message });
      return;
    }
    const conn = (state.config.connections || []).find((c) => c.id === body.connectionId);
    if (!conn) {
      send(res, 404, { error: "Connection not found" });
      return;
    }
    try {
      const sections = await listSections(conn);
      send(res, 200, { sections });
    } catch (e) {
      send(res, 502, { error: e.message || "Media server did not respond" });
    }
    return;
  }

  if (url.pathname === "/v1/import" && req.method === "POST") {
    if (!requireSession(req, res)) return;
    let body;
    try {
      body = await readBody(req);
    } catch (e) {
      send(res, 400, { error: e.message });
      return;
    }
    const conn = (state.config.connections || []).find((c) => c.id === body.connectionId);
    if (!conn) {
      send(res, 404, { error: "Connection not found" });
      return;
    }
    try {
      const titles = await importSections(conn, Array.isArray(body.sectionKeys) ? body.sectionKeys : []);
      send(res, 200, { titles });
    } catch (e) {
      send(res, 502, { error: e.message || "Import failed" });
    }
    return;
  }

  if ((req.method === "GET" || req.method === "HEAD") && url.pathname === "/v1/stream") {
    if (!sessionFrom(req, url)) {
      send(res, 401, { error: "The local pairing session expired" });
      return;
    }
    const id = String(url.searchParams.get("id") || "");
    if (!id) {
      send(res, 400, { error: "Missing title id" });
      return;
    }
    const local = findLocalFile(id);
    if (local) {
      try {
        streamLocalFile(req, res, local);
      } catch (e) {
        send(res, 500, { error: e.message || "Could not read that file" });
      }
      return;
    }
    const remote = remoteKeyFromId(id);
    if (!remote) {
      send(res, 404, { error: "CINEVO Node has no file for that title" });
      return;
    }
    const connectionId = String(url.searchParams.get("connectionId") || "");
    const conns = connectionsFor(remote.provider, connectionId);
    let last = "No matching media server on this Node";
    for (const conn of conns) {
      try {
        const play =
          remote.provider === "plex" ? await plexPlayUrl(conn, remote.key) : await jellyPlayUrl(conn, remote.key);
        await proxyUpstream(req, res, play.url, play.headers);
        return;
      } catch (e) {
        last = e.message || last;
      }
    }
    send(res, 502, { error: last });
    return;
  }

  send(res, 404, { error: "Not found" });
}

const server = http.createServer((req, res) => {
  handle(req, res).catch((err) => {
    send(res, 500, { error: err.message || "Node error" });
  });
});

server.on("error", (err) => {
  if (err && err.code === "EADDRINUSE") {
    console.error(`CINEVO Node: port ${PORT} is already in use on ${HOST}`);
    process.exit(1);
  }
  console.error(err);
  process.exit(1);
});

server.listen(PORT, HOST, () => {
  console.log(`CINEVO Node v${VERSION}`);
  console.log(`Loopback dashboard: http://${HOST}:${PORT}`);
  console.log(`Pairing code: ${state.code} (expires in 10 minutes)`);
  console.log("No remote ingress. Media tokens stay in this process.");
  if (!process.argv.includes("--no-open")) openBrowser(`http://${HOST}:${PORT}`);
});

function openBrowser(url) {
  const safe = url.replace(/"/g, "");
  let cmd;
  if (process.platform === "darwin") cmd = `open "${safe}"`;
  else if (process.platform === "win32") cmd = `cmd /c start "" "${safe}"`;
  else cmd = `xdg-open "${safe}"`;
  exec(cmd, () => {});
}
