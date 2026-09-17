import { useEffect, useRef, useState } from "react";
import { FolderPlus, HardDrive, Trash2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { addNodeConnection, addNodeFolder, importNodeSections, listNodeSections } from "@/lib/node-client";
import { remoteTitle, scanFileList, isVideoFile, playableCount } from "@/lib/library";
import { reconnectFolders, saveFolderHandle } from "@/lib/folder-handles";
import { useCinevo } from "@/lib/cinevo-store";
import { PlexConnect } from "./plex-connect";

export function AddLibrary() {
  const sources = useCinevo((s) => s.sources);
  const localTitles = useCinevo((s) => s.localTitles);
  const removeSource = useCinevo((s) => s.removeSource);
  const addFolderTitles = useCinevo((s) => s.addFolderTitles);
  const addRemoteTitles = useCinevo((s) => s.addRemoteTitles);
  const nodeUrl = useCinevo((s) => s.nodeUrl);
  const nodeToken = useCinevo((s) => s.nodeToken);
  const setCoreOpen = useCinevo((s) => s.setCoreOpen);
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [folderPath, setFolderPath] = useState("");
  const [jfUrl, setJfUrl] = useState("http://127.0.0.1:8096");
  const [jfUser, setJfUser] = useState("");
  const [jfPass, setJfPass] = useState("");
  const [sections, setSections] = useState<{ connectionId: string; provider: "plex" | "jellyfin"; items: { key: string; title: string }[] } | null>(
    null,
  );
  const [picked, setPicked] = useState<string[]>([]);

  useEffect(() => {
    const onFiles = (event: Event) => {
      const files = (event as CustomEvent<File[]>).detail;
      if (Array.isArray(files) && files.length) ingestFiles(files, "Home folder");
    };
    window.addEventListener("cinevo:files", onFiles);
    return () => window.removeEventListener("cinevo:files", onFiles);
    // ingestFiles is recreated each render; listen once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ingestFiles = (files: FileList | File[], name?: string) => {
    const titles = scanFileList(files, name);
    if (!titles.length) {
      setMessage("No video files in that folder. mp4, mkv, mov, webm.");
      return;
    }
    const folder = titles[0].sourceLabel;
    addFolderTitles(titles, {
      id: `src-folder-${folder}`,
      kind: "folder",
      name: folder,
      selected: true,
      count: titles.length,
    });
    setMessage(`Indexed ${titles.length} files from ${folder}.`);
  };

  const onFolder = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) ingestFiles(e.target.files);
    e.target.value = "";
  };

  const pickDirectory = async () => {
    const picker = (window as Window & { showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle> }).showDirectoryPicker;
    if (!picker) {
      fileRef.current?.click();
      return;
    }
    try {
      const handle = await picker();
      const files: File[] = [];
      await walkDir(handle, files);
      ingestFiles(files, handle.name);
      await saveFolderHandle(`src-folder-${handle.name}`, handle, handle.name);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      fileRef.current?.click();
    }
  };

  const addPath = async () => {
    if (!folderPath.trim()) return;
    if (!nodeToken) {
      setMessage("Pair CINEVO Node to scan a path on the computer that holds the files.");
      return;
    }
    setPending(true);
    try {
      const res = await addNodeFolder(nodeUrl, nodeToken, folderPath.trim());
      if (!res.ok) {
        setMessage(res.error);
        return;
      }
      const titles = res.titles.map((t, i) =>
        remoteTitle({
          id: t.id || `node-folder-${i}`,
          title: t.title || "Untitled",
          year: t.year,
          source: "plex",
          sourceLabel: res.name,
          synopsis: `Scanned from ${res.name} on CINEVO Node.`,
          genre: "Home library",
        }),
      );
      addFolderTitles(
        titles.map((t) => ({
          ...t,
          source: "folder",
          sourceLabel: res.name,
          genre: "Home library",
          genres: ["Home library", res.name],
        })),
        { id: res.id, kind: "folder", name: res.name, path: folderPath.trim(), selected: true, count: res.count },
      );
      setFolderPath("");
      setMessage(`Scanned ${res.count} files on Node.`);
    } finally {
      setPending(false);
    }
  };

  const connect = async (provider: "jellyfin") => {
    if (!nodeToken) {
      setMessage("Pair CINEVO Node first — Jellyfin stays on that computer.");
      return;
    }
    if (!jfUser.trim() || !jfPass) {
      setMessage("Enter your Jellyfin username and password.");
      return;
    }
    setPending(true);
    try {
      const added = await addNodeConnection(nodeUrl, nodeToken, {
        provider,
        baseUrl: jfUrl.trim(),
        username: jfUser.trim(),
        password: jfPass,
      });
      if (!added.ok) {
        setMessage(added.error);
        return;
      }
      const listed = await listNodeSections(nodeUrl, nodeToken, added.id);
      if (!listed.ok) {
        setMessage(listed.error);
        return;
      }
      setSections({ connectionId: added.id, provider, items: listed.sections });
      setPicked(listed.sections.map((s) => s.key));
      setMessage(`Connected. Select the sections CINEVO may index.`);
    } finally {
      setPending(false);
    }
  };

  const importPicked = async () => {
    if (!sections || !nodeToken) return;
    setPending(true);
    try {
      const res = await importNodeSections(nodeUrl, nodeToken, sections.connectionId, picked);
      if (!res.ok) {
        setMessage(res.error);
        return;
      }
      const titles = res.titles.map((t) =>
        remoteTitle({
          id: t.id,
          title: t.title,
          year: t.year,
          kind: t.kind === "series" ? "series" : "movie",
          synopsis: t.synopsis,
          source: sections.provider,
          sourceLabel: t.sourceLabel || sections.provider,
          genre: t.genre,
        }),
      );
      addRemoteTitles(titles, {
        id: sections.connectionId,
        kind: sections.provider,
        name: sections.provider === "plex" ? "Plex" : "Jellyfin",
        selected: true,
        count: titles.length,
      });
      setSections(null);
      setMessage(`Imported ${titles.length} titles. Playback stays on your server.`);
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="space-y-5">
      <input
        ref={fileRef}
        type="file"
        multiple
        // @ts-expect-error webkitdirectory is a Chromium attribute
        webkitdirectory=""
        className="hidden"
        aria-label="Select media folder"
        onChange={onFolder}
      />

      <div className="grid gap-3 md:grid-cols-3">
        <article className="glass rounded-xl p-4">
          <FolderPlus className="text-cine-cyan" size={20} />
          <h3 className="mt-3 font-display tracking-widest">Folders</h3>
          <p className="mt-1 text-sm text-cine-faint">Pick a folder on this computer. We index names only.</p>
          <button
            type="button"
            onClick={() => void pickDirectory()}
            className="mt-4 h-11 w-full rounded-md bg-cine-cyan font-ui font-bold text-cine-bg"
          >
            Select folders
          </button>
          <div className="mt-3 flex gap-2">
            <input
              value={folderPath}
              onChange={(e) => setFolderPath(e.target.value)}
              placeholder="/Movies or D:\\Media"
              aria-label="Folder path on Node"
              className="h-11 min-w-0 flex-1 rounded-md border border-cine-border bg-cine-well px-3 font-mono text-sm"
            />
            <button
              type="button"
              onClick={() => void addPath()}
              disabled={pending}
              className="h-11 rounded-md border border-cine-cyan px-3 font-ui font-bold text-cine-cyan"
            >
              Scan
            </button>
          </div>
        </article>

        <PlexConnect />

        <article className="glass rounded-xl p-4">
          <HardDrive className="text-cine-cyan" size={20} />
          <h3 className="mt-3 font-display tracking-widest">Jellyfin</h3>
          <p className="mt-1 text-sm text-cine-faint">Username stays local. CINEVO never stores the password in the browser.</p>
          <input
            value={jfUrl}
            onChange={(e) => setJfUrl(e.target.value)}
            aria-label="Jellyfin server address"
            className="mt-3 h-11 w-full rounded-md border border-cine-border bg-cine-well px-3 font-mono text-sm"
          />
          <input
            value={jfUser}
            onChange={(e) => setJfUser(e.target.value)}
            placeholder="Username"
            aria-label="Jellyfin username"
            className="mt-2 h-11 w-full rounded-md border border-cine-border bg-cine-well px-3 font-ui"
          />
          <input
            type="password"
            value={jfPass}
            onChange={(e) => setJfPass(e.target.value)}
            placeholder="Password"
            aria-label="Jellyfin password"
            className="mt-2 h-11 w-full rounded-md border border-cine-border bg-cine-well px-3 font-ui"
          />
          <button
            type="button"
            onClick={() => void connect("jellyfin")}
            disabled={pending}
            className="mt-3 h-11 w-full rounded-md border border-cine-cyan font-ui font-bold text-cine-cyan"
          >
            Connect Jellyfin
          </button>
        </article>
      </div>

      {!nodeToken ? (
        <p className="text-sm text-cine-muted">
          Plex signs in from here. Jellyfin and disk paths need{" "}
          <Link to="/connect" className="text-cine-cyan" onClick={() => setCoreOpen(false)}>
            a paired CINEVO Node
          </Link>
          . Folder pick works in this browser now.
        </p>
      ) : null}

      {sections ? (
        <div className="glass rounded-xl p-4">
          <p className="font-ui text-xs tracking-[0.18em] text-cine-cyan">SELECT SECTIONS</p>
          <div className="mt-3 space-y-2">
            {sections.items.map((s) => (
              <label key={s.key} className="flex min-h-11 items-center justify-between gap-3 rounded-md bg-cine-well px-3">
                <span className="font-ui">{s.title}</span>
                <input
                  type="checkbox"
                  className="size-5 accent-cine-cyan"
                  checked={picked.includes(s.key)}
                  onChange={(e) =>
                    setPicked((cur) => (e.target.checked ? [...cur, s.key] : cur.filter((k) => k !== s.key)))
                  }
                />
              </label>
            ))}
          </div>
          <button
            type="button"
            onClick={() => void importPicked()}
            disabled={pending || !picked.length}
            className="mt-4 h-11 rounded-md bg-cine-cyan px-5 font-ui font-bold text-cine-bg"
          >
            Add selected to CINEVO
          </button>
        </div>
      ) : null}

      {localTitles.length && playableCount() === 0 ? (
        <div className="glass rounded-xl px-4 py-4">
          <p className="text-sm text-cine-muted">
            Titles are indexed, but this browser session has no files. Reconnect the folder to play.
          </p>
          <button
            type="button"
            className="mt-3 h-11 rounded-md bg-cine-cyan px-4 font-ui font-bold text-cine-bg"
            onClick={async () => {
              const n = await reconnectFolders();
              if (n) {
                useCinevo.setState({ localTitles: [...useCinevo.getState().localTitles] });
                setMessage(`Reconnected ${n} files.`);
              } else {
                fileRef.current?.click();
              }
            }}
          >
            Reconnect folders
          </button>
        </div>
      ) : null}

      {sources.length ? (
        <div className="space-y-2">
          <p className="font-ui text-xs tracking-[0.18em] text-cine-cyan">ACTIVE SOURCES</p>
          {sources.map((s) => (
            <div key={s.id} className="glass flex items-center justify-between rounded-xl px-3 py-2">
              <div>
                <b className="font-ui capitalize">{s.name}</b>
                <p className="font-mono text-xs text-cine-faint">
                  {s.kind} · {s.count} titles {s.path ? `· ${s.path}` : ""}
                </p>
              </div>
              <button
                type="button"
                aria-label={`Remove ${s.name}`}
                className="flex size-11 items-center justify-center text-cine-muted hover:text-cine-danger"
                onClick={() => removeSource(s.id)}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-cine-border px-4 py-5 text-sm text-cine-faint">
          Nothing added yet. Select a folder, sign in with Plex, or pair Node for Jellyfin.
        </p>
      )}

      {message ? <p className="text-sm text-cine-cyan">{message}</p> : null}
    </div>
  );
}

async function walkDir(dir: FileSystemDirectoryHandle, out: File[], depth = 0) {
  if (depth > 6 || out.length > 80) return;
  // @ts-expect-error async iterator on directory handles
  for await (const entry of dir.values()) {
    if (out.length > 80) return;
    if (entry.kind === "file") {
      const file = await (entry as FileSystemFileHandle).getFile();
      if (isVideoFile(file.name)) out.push(file);
    } else if (entry.kind === "directory") {
      await walkDir(entry as FileSystemDirectoryHandle, out, depth + 1);
    }
  }
}
