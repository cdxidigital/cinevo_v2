import { useEffect, useMemo, useState } from "react";
import { Check, ChevronLeft, ListPlus, Play, Search, Star, X } from "lucide-react";
import { filterCatalog, similarTo, type Title } from "@/lib/catalog";
import { libraryPool, titleById, useCinevo } from "@/lib/cinevo-store";
import { askCinevo } from "@/lib/ask-cinevo";
import { Rail } from "./poster";
import { InstallerCards } from "./installers";
import { Link } from "@tanstack/react-router";
import { THEMES } from "@/lib/library";

export function Detail() {
  const id = useCinevo((s) => s.selectedId);
  const closeTitle = useCinevo((s) => s.closeTitle);
  const play = useCinevo((s) => s.play);
  const fav = useCinevo((s) => (id ? s.favorites.includes(id) : false));
  const queued = useCinevo((s) => (id ? s.tonight.includes(id) : false));
  const progress = useCinevo((s) => (id ? s.progress[id] ?? 0 : 0));
  const toggleFavorite = useCinevo((s) => s.toggleFavorite);
  const addTonight = useCinevo((s) => s.addTonight);
  const removeTonight = useCinevo((s) => s.removeTonight);
  const addNote = useCinevo((s) => s.addNote);
  const title = titleById(id);
  const [note, setNote] = useState("");
  useEffect(() => {
    setNote("");
  }, [id]);
  if (!title) return null;
  const similar = similarTo(title, libraryPool());
  return (
    <div className="house-detail">
      <img src={title.still || "/stills/theater.jpg"} alt="" className="house-detail__art" />
      <div className="house-detail__veil" />
      <div className="house-detail__inner">
        <button type="button" onClick={closeTitle} className="house-back">
          <ChevronLeft size={16} /> Back
        </button>
        <div className="house-detail__copy">
          <p className="house-kicker">{title.kind === "series" ? "Series" : "Feature"}</p>
          <h1>{title.title}</h1>
          <p className="house-meta">
            <span>{title.year}</span>
            <i />
            <span>{title.runtime}</span>
            <i />
            <span>{title.genre}</span>
            {title.rating > 0 ? (
              <>
                <i />
                <span>
                  <Star size={12} className="inline text-cine-amber" fill="currentColor" /> {title.rating.toFixed(1)}
                </span>
              </>
            ) : null}
          </p>
          <div className="house-actions">
            <button type="button" onClick={() => play(title.id)} className="house-btn house-btn--play">
              <Play size={16} fill="currentColor" /> {progress > 0 && progress < 100 ? "Resume" : "Play"}
            </button>
            <button type="button" onClick={() => toggleFavorite(title.id)} className="house-btn house-btn--ghost">
              {fav ? <Check size={16} /> : <ListPlus size={16} />}
              {fav ? "In My List" : "My List"}
            </button>
            <button
              type="button"
              onClick={() => (queued ? removeTonight(title.id) : addTonight(title.id))}
              className="house-btn house-btn--ghost"
            >
              {queued ? "Queued" : "Tonight"}
            </button>
          </div>
          <p className="mt-7 max-w-xl text-cine-muted">{title.synopsis}</p>
          <p className="mt-4 font-ui text-sm text-cine-faint">
            {title.sourceLabel ? `From ${title.sourceLabel}` : null}
            {title.director && title.director !== title.sourceLabel ? ` · Dir. ${title.director}` : null}
            {title.cast.length ? ` · ${title.cast.join(" · ")}` : null}
          </p>
        </div>
        <form
          className="mt-10 max-w-xl"
          onSubmit={(e) => {
            e.preventDefault();
            addNote(title.id, note);
            setNote("");
          }}
        >
          <label className="house-kicker">A note on this title</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={280}
            placeholder="Private. Stays on this device."
            className="mt-2 h-20 w-full rounded-md border border-cine-border bg-cine-well p-3 font-ui"
          />
          <button type="submit" className="house-btn house-btn--ghost mt-2">
            Save note
          </button>
        </form>
        <div className="mt-14">
          <Rail heading="Similar titles" titles={similar} />
        </div>
      </div>
    </div>
  );
}

export function SearchOverlay() {
  const open = useCinevo((s) => s.searchOpen);
  const setSearchOpen = useCinevo((s) => s.setSearchOpen);
  const openTitle = useCinevo((s) => s.openTitle);
  const [q, setQ] = useState("");
  const extra = useCinevo((s) => s.localTitles);
  const remote = useCinevo((s) => s.remoteTitles);
  const results = useMemo(
    () => filterCatalog({ query: q, pool: [...extra, ...remote] }).slice(0, 8),
    [q, extra, remote],
  );
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center bg-cine-bg/80 p-4 pt-20"
      onMouseDown={() => setSearchOpen(false)}
    >
      <section
        className="glass-strong w-full max-w-2xl rounded-xl p-4"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 rounded-lg border border-cine-border bg-cine-well px-3">
          <Search size={16} className="text-cine-cyan" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search your library"
            aria-label="Search your library"
            className="h-12 flex-1 bg-transparent font-ui text-base outline-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && q.trim() && results[0]) {
                openTitle(results[0].id);
                setSearchOpen(false);
              }
            }}
          />
          <button type="button" aria-label="Close search" className="flex size-11 items-center justify-center" onClick={() => setSearchOpen(false)}>
            <X size={16} />
          </button>
        </div>
        <p className="mt-3 font-mono text-xs text-cine-faint">
          {extra.length + remote.length === 0
            ? "Nothing in your library yet."
            : q.trim() && !results.length
              ? "No matches."
              : `${results.length} titles · Enter opens · Esc`}
        </p>
        <div className="mt-2 space-y-1">
          {results.map((t) => (
            <button
              key={t.id}
              type="button"
              className="flex min-h-11 w-full items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-cine-well"
              onClick={() => {
                openTitle(t.id);
                setSearchOpen(false);
              }}
            >
              <img src={t.poster} alt="" className="h-14 w-10 rounded-sm object-cover" />
              <span>
                <b className="block font-ui">{t.title}</b>
                <small className="text-cine-faint">
                  {t.year} · {t.genre}
                </small>
              </span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

export function SettingsModal() {
  const open = useCinevo((s) => s.settingsOpen);
  const setSettingsOpen = useCinevo((s) => s.setSettingsOpen);
  const prefs = useCinevo((s) => s.prefs);
  const patchPrefs = useCinevo((s) => s.patchPrefs);
  const setTheme = useCinevo((s) => s.setTheme);
  const clearLocalData = useCinevo((s) => s.clearLocalData);
  const [confirmClear, setConfirmClear] = useState(false);
  useEffect(() => {
    if (!open) setConfirmClear(false);
  }, [open]);
  if (!open) return null;
  const rows: { key: "nightMode" | "zenMode" | "focusMode"; label: string; hint: string }[] = [
    { key: "nightMode", label: "OLED night", hint: "True black surfaces" },
    { key: "zenMode", label: "Zen mode", hint: "Hide poster metadata" },
    { key: "focusMode", label: "Focus player", hint: "Quieter playback chrome" },
  ];
  return (
    <div className="fixed inset-0 z-40 bg-cine-bg/80 p-4" onMouseDown={() => setSettingsOpen(false)}>
      <section
        className="glass-strong mx-auto mt-16 max-w-lg rounded-xl p-5"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="mb-4 flex items-start justify-between">
          <div>
            <p className="font-ui text-xs tracking-[0.22em] text-cine-cyan">LOCAL PREFERENCES</p>
            <h2 className="font-display text-lg tracking-widest">Settings</h2>
          </div>
          <button type="button" aria-label="Close settings" onClick={() => setSettingsOpen(false)}>
            <X size={18} />
          </button>
        </header>
        <div className="space-y-3">
          <p className="font-ui text-xs tracking-[0.18em] text-cine-cyan">APPEARANCE</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {THEMES.map((t) => (
              <button
                key={t.id}
                type="button"
                aria-label={`${t.label} theme`}
                aria-pressed={prefs.theme === t.id}
                onClick={() => setTheme(t.id)}
                className={`flex h-11 flex-col items-center justify-center rounded-md border ${
                  prefs.theme === t.id ? "border-cine-cyan glow-cyan" : "border-cine-border"
                }`}
              >
                <i className="swatch size-4 rounded-full" data-swatch={t.id} />
                <span className="font-ui text-xs">{t.label}</span>
              </button>
            ))}
          </div>
          {rows.map((row) => (
            <label key={row.key} className="flex items-center justify-between gap-4 rounded-lg bg-cine-surface px-3 py-3">
              <span>
                <b className="block font-ui text-sm">{row.label}</b>
                <small className="text-cine-faint">{row.hint}</small>
              </span>
              <input
                type="checkbox"
                checked={prefs[row.key]}
                onChange={(e) => patchPrefs({ [row.key]: e.target.checked })}
                className="size-5 accent-cine-cyan"
              />
            </label>
          ))}
        </div>
        <div className="mt-6 rounded-lg border border-cine-danger/40 bg-cine-surface px-3 py-3">
          <b className="block font-ui text-sm">Local data</b>
          <p className="mt-1 text-xs text-cine-faint">
            This clears watch progress, My List, indexed titles, and Node pairing on this device.
          </p>
          <button
            type="button"
            className={`mt-3 h-11 w-full rounded-md font-ui font-bold ${
              confirmClear ? "bg-cine-danger text-cine-text" : "border border-cine-danger text-cine-danger"
            }`}
            onClick={() => {
              if (!confirmClear) {
                setConfirmClear(true);
                return;
              }
              clearLocalData();
              setConfirmClear(false);
              setSettingsOpen(false);
            }}
          >
            {confirmClear ? "Tap again to clear everything" : "Clear all local data"}
          </button>
        </div>
      </section>
    </div>
  );
}

export function CoreModal() {
  const open = useCinevo((s) => s.coreOpen);
  const tab = useCinevo((s) => s.coreTab);
  const setCoreOpen = useCinevo((s) => s.setCoreOpen);
  const setCoreTab = useCinevo((s) => s.setCoreTab);
  const sources = useCinevo((s) => s.sources);
  const invites = useCinevo((s) => s.invites);
  const addInvite = useCinevo((s) => s.addInvite);
  const setInviteStatus = useCinevo((s) => s.setInviteStatus);
  const aiConsent = useCinevo((s) => s.aiConsent);
  const setAiConsent = useCinevo((s) => s.setAiConsent);
  const flash = useCinevo((s) => s.flash);
  const [name, setName] = useState("");
  const [days, setDays] = useState(7);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [pending, setPending] = useState(false);
  if (!open) return null;
  const points =
    (sources.length ? 1 : 0) +
    (invites.length ? 1 : 0) +
    (aiConsent ? 1 : 0) +
    1;

  const ask = async () => {
    if (!question.trim() || pending) return;
    setPending(true);
    try {
      const res = await askCinevo({
        data: {
          question,
          titles: libraryPool().map((t) => ({
            title: t.title,
            year: t.year,
            kind: t.kind,
            genre: t.genre,
            rating: t.rating,
            synopsis: t.synopsis,
          })),
        },
      });
      if (res.ok) setAnswer(res.text.replace(/\*\*/g, ""));
      else flash(res.error);
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-cine-bg/80 p-4" onMouseDown={() => setCoreOpen(false)}>
      <section
        className="glass-strong mx-auto my-8 max-w-3xl rounded-xl p-5"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="mb-4 flex items-start justify-between">
          <div>
            <p className="font-ui text-xs tracking-[0.22em] text-cine-cyan">CINEVO CORE</p>
            <h2 className="font-display text-xl tracking-widest">Your media. Your rules.</h2>
          </div>
          <button type="button" aria-label="Close Core" onClick={() => setCoreOpen(false)}>
            <X size={18} />
          </button>
        </header>
        <nav className="mb-5 flex flex-wrap gap-2">
          {(["libraries", "sharing", "stewardship", "ai"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setCoreTab(t)}
              className={`h-11 rounded-full px-4 font-ui text-sm font-semibold ${
                tab === t ? "bg-cine-cyan text-cine-bg" : "bg-cine-surface text-cine-muted"
              }`}
            >
              {t === "libraries" ? "Libraries" : t === "sharing" ? "Sharing" : t === "stewardship" ? "Privacy" : "AI"}
            </button>
          ))}
        </nav>
        {tab === "libraries" && (
          <div className="space-y-6">
            <p className="text-sm text-cine-muted">
              {sources.length
                ? `${sources.length} source${sources.length === 1 ? "" : "s"} connected.`
                : "No sources yet. Folders scan in the browser. Sign in with Plex from Library. Jellyfin uses CINEVO Node."}
            </p>
            {sources.length ? (
              <ul className="space-y-2">
                {sources.map((s) => (
                  <li key={s.id} className="rounded-lg bg-cine-surface px-3 py-3 font-ui text-sm">
                    <b className="capitalize">{s.name}</b>
                    <span className="ml-2 font-mono text-xs text-cine-faint">
                      {s.kind} · {s.count}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
            <Link
              to="/app/library"
              className="inline-flex h-11 items-center rounded-md bg-cine-cyan px-5 font-ui font-bold text-cine-bg"
              onClick={() => setCoreOpen(false)}
            >
              Open Library
            </Link>
            <div>
              <p className="font-ui text-xs tracking-[0.18em] text-cine-cyan">NODE INSTALLERS</p>
              <p className="mt-1 mb-3 text-sm text-cine-muted">
                Required for Plex, Jellyfin, and disk paths. Folder pick works without it.
              </p>
              <InstallerCards />
              <Link
                to="/connect"
                className="mt-3 inline-flex h-11 items-center font-ui text-sm font-bold text-cine-cyan"
                onClick={() => setCoreOpen(false)}
              >
                Open pairing
              </Link>
            </div>
          </div>
        )}
        {tab === "sharing" && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-11 rounded-md border border-cine-border bg-cine-well px-3 font-ui"
                placeholder="Friend name"
              />
              <select
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="h-11 rounded-md border border-cine-border bg-cine-well px-3 font-ui"
              >
                <option value={3}>3 days</option>
                <option value={7}>7 days</option>
                <option value={14}>14 days</option>
              </select>
              <button
                type="button"
                className="h-11 rounded-md bg-cine-magenta px-4 font-ui font-bold text-cine-bg"
                onClick={() => {
                  addInvite(name, days);
                  flash("Invite created");
                }}
              >
                Create invite
              </button>
            </div>
            {invites.length ? (
              invites.map((i) => (
                <article key={i.id} className="flex items-center justify-between rounded-lg bg-cine-surface px-3 py-3">
                  <span>
                    <b className="font-ui">{i.name}</b>
                    <small className="ml-2 text-cine-faint">
                      {i.status} · {i.days}d
                    </small>
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="font-ui text-sm text-cine-cyan"
                      onClick={() => setInviteStatus(i.id, i.status === "paused" ? "active" : "paused")}
                    >
                      {i.status === "paused" ? "Restore" : "Pause"}
                    </button>
                    <button
                      type="button"
                      className="font-ui text-sm text-cine-danger"
                      onClick={() => setInviteStatus(i.id, "revoked")}
                    >
                      Revoke
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <p className="rounded-lg border border-dashed border-cine-border px-3 py-4 text-sm text-cine-faint">
                No invites yet. Name a friend and create one — nothing is pre-seeded.
              </p>
            )}
          </div>
        )}
        {tab === "stewardship" && (
          <div>
            <p className="font-mono text-4xl text-cine-cyan">{points}</p>
            <p className="font-ui text-sm text-cine-muted">stewardship points — for care, not watch-time.</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {["Private index", "Library care", "Invite boundary", "AI consent"].map((label, i) => (
                <article key={label} className="rounded-lg border border-cine-border bg-cine-surface p-3">
                  <b className="font-ui text-sm">{label}</b>
                  <p className="text-xs text-cine-faint">{i < points ? "Complete" : "Open"}</p>
                </article>
              ))}
            </div>
          </div>
        )}
        {tab === "ai" && (
          <div className="space-y-3">
            <label className="flex items-center justify-between rounded-lg bg-cine-surface px-3 py-3">
              <span>
                <b className="block font-ui text-sm">Private metadata assistance</b>
                <small className="text-cine-faint">Only titles in this CINEVO library</small>
              </span>
              <input
                type="checkbox"
                checked={aiConsent}
                onChange={(e) => setAiConsent(e.target.checked)}
                className="size-5 accent-cine-cyan"
              />
            </label>
            {aiConsent ? (
              <>
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  maxLength={400}
                  placeholder="What should I watch tonight?"
                  className="h-24 w-full rounded-md border border-cine-border bg-cine-well p-3 font-ui"
                />
                <button
                  type="button"
                  onClick={ask}
                  disabled={pending}
                  className="h-11 rounded-md bg-cine-cyan px-5 font-ui font-bold text-cine-bg"
                >
                  {pending ? "Thinking…" : "Ask CINEVO"}
                </button>
                {answer ? <p className="rounded-lg bg-cine-surface p-3 text-sm text-cine-muted">{answer}</p> : null}
              </>
            ) : (
              <p className="text-sm text-cine-faint">Enable consent to ask the concierge.</p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

export function Toast() {
  const toast = useCinevo((s) => s.toast);
  if (!toast) return null;
  return (
    <div className="fixed bottom-5 left-1/2 z-[60] -translate-x-1/2 rounded-full border border-cine-cyan bg-cine-elevated px-4 py-2 font-ui text-sm tracking-wide">
      {toast}
    </div>
  );
}

export type { Title };
