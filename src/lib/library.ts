import type { Accent, Kind, Title } from "./catalog";

export const VIDEO_EXT = /\.(mp4|mkv|mov|avi|webm|m4v|wmv|ts|m2ts)$/i;

export type SourceKind = "cinevo" | "folder" | "plex" | "jellyfin";

export type LibSource = {
  id: string;
  kind: Exclude<SourceKind, "cinevo">;
  name: string;
  path?: string;
  baseUrl?: string;
  selected: boolean;
  count: number;
};

export type LibraryTitle = Title & {
  source: SourceKind;
  sourceLabel: string;
  path?: string;
  connectionId?: string;
};

const blobs = new Map<string, string>();

export function mediaUrl(id: string) {
  return blobs.get(id);
}

export function playableCount() {
  return blobs.size;
}

export function rememberBlob(id: string, file: File) {
  const prev = blobs.get(id);
  if (prev) URL.revokeObjectURL(prev);
  const url = URL.createObjectURL(file);
  blobs.set(id, url);
  return url;
}

export function parseFilename(fileName: string) {
  const base = fileName.split(/[/\\]/).pop() || fileName;
  let stem = base.replace(VIDEO_EXT, "");
  const yearHit = /\(?((?:19|20)\d{2})\)?/.exec(stem);
  const year = yearHit ? yearHit[1] : "";
  stem = stem
    .replace(/[._]+/g, " ")
    .replace(/\((?:19|20)\d{2}\)/g, " ")
    .replace(/\b(?:19|20)\d{2}\b/g, " ")
    .replace(/\b(1080p|720p|2160p|480p|4k|uhd|hdr|bluray|webrip|web-dl|x264|x265|hevc|dts|aac|remux)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return { title: stem || base.replace(VIDEO_EXT, ""), year, fileName: base };
}

export function isVideoFile(name: string) {
  return VIDEO_EXT.test(name);
}

const ACCENTS: Accent[] = ["cyan", "magenta", "violet", "amber"];

export function titleFromFile(file: File, folderName: string, index: number): LibraryTitle {
  const parsed = parseFilename(file.name);
  const id = `folder-${hash(`${folderName}:${file.name}:${file.size}`)}`;
  const url = rememberBlob(id, file);
  const accent = ACCENTS[index % ACCENTS.length];
  return {
    id,
    title: parsed.title,
    kind: /s\d{2}e\d{2}/i.test(file.name) ? "series" : "movie",
    year: parsed.year || "—",
    runtime: file.size > 2_000_000_000 ? "2h+" : file.size > 700_000_000 ? "~2h" : "~90m",
    genre: "Home library",
    genres: ["Home library", folderName],
    synopsis: `Imported from ${folderName}. File stays on this device — CINEVO only indexes the name.`,
    cast: [],
    director: folderName,
    rating: 0,
    addedAt: new Date().toISOString().slice(0, 10),
    poster: makePoster(parsed.title, accent),
    still: "/stills/theater.jpg",
    accent,
    source: "folder",
    sourceLabel: folderName,
    path: file.name,
  };
}

export function scanFileList(files: FileList | File[], folderName = "Home folder"): LibraryTitle[] {
  const list = Array.from(files).filter((f) => isVideoFile(f.name) || isVideoFile(f.webkitRelativePath || ""));
  const name = folderName || guessFolder(list) || "Home folder";
  return list.slice(0, 80).map((file, i) => titleFromFile(file, name, i));
}

function guessFolder(files: File[]) {
  const rel = files.find((f) => f.webkitRelativePath)?.webkitRelativePath || "";
  return rel.split("/")[0] || "";
}

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h.toString(16);
}

export function makePoster(title: string, accent: Accent) {
  if (typeof document === "undefined") return "/stills/theater.jpg";
  const c = document.createElement("canvas");
  c.width = 400;
  c.height = 600;
  const ctx = c.getContext("2d");
  if (!ctx) return "/stills/theater.jpg";
  const ink: Record<Accent, string> = {
    cyan: "#f5f5f5",
    magenta: "#3b7bff",
    violet: "#8aa0c4",
    amber: "#d6d0c4",
  };
  ctx.fillStyle = "#0b0b0b";
  ctx.fillRect(0, 0, 400, 600);
  ctx.strokeStyle = "rgba(255,255,255,0.16)";
  ctx.lineWidth = 1;
  ctx.strokeRect(18, 18, 364, 564);
  ctx.fillStyle = ink[accent] || "#f5f5f5";
  ctx.font = "800 28px Inter, system-ui, sans-serif";
  wrapText(ctx, title, 36, 250, 328, 34);
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.font = "700 12px Inter, system-ui, sans-serif";
  ctx.fillText("CINEVO", 36, 560);
  return c.toDataURL("image/jpeg", 0.85);
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, max: number, lh: number) {
  const words = text.split(" ");
  let line = "";
  let yy = y;
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (ctx.measureText(next).width > max) {
      ctx.fillText(line, x, yy);
      line = w;
      yy += lh;
    } else line = next;
  }
  if (line) ctx.fillText(line, x, yy);
}

export function remoteTitle(input: {
  id: string;
  title: string;
  year?: string;
  kind?: Kind;
  synopsis?: string;
  source: "plex" | "jellyfin";
  sourceLabel: string;
  genre?: string;
  path?: string;
  connectionId?: string;
}): LibraryTitle {
  const accent: Accent = input.source === "plex" ? "amber" : "violet";
  return {
    id: input.id,
    title: input.title,
    kind: input.kind ?? "movie",
    year: input.year || "—",
    runtime: "—",
    genre: input.genre || (input.source === "plex" ? "Plex" : "Jellyfin"),
    genres: [input.source === "plex" ? "Plex" : "Jellyfin"],
    synopsis: input.synopsis || `Indexed from ${input.sourceLabel}. Play through CINEVO Node on this computer.`,
    cast: [],
    director: input.sourceLabel,
    rating: 0,
    addedAt: new Date().toISOString().slice(0, 10),
    poster: makePoster(input.title, accent),
    still: "/stills/theater.jpg",
    accent,
    source: input.source,
    sourceLabel: input.sourceLabel,
    path: input.path,
    connectionId: input.connectionId,
  };
}

export const THEMES = [
  { id: "pulse", label: "Night", accent: "#f5f5f5" },
  { id: "nova", label: "Rebound", accent: "#3b7bff" },
  { id: "iris", label: "Paper", accent: "#ecece8" },
  { id: "ember", label: "Studio", accent: "#d6d0c4" },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];
