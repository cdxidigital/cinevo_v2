import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { askCinevo } from "@/lib/ask-cinevo";
import { libraryPool, useCinevo, type CoreTab } from "@/lib/cinevo-store";
import { InstallerCards } from "@/components/cinevo/installers";

const TABS: CoreTab[] = ["libraries", "sharing", "stewardship", "ai", "operations"];

export const Route = createFileRoute("/app/core/$tab")({
  beforeLoad: ({ params }) => {
    if (!TABS.includes(params.tab as CoreTab)) {
      throw redirect({ to: "/app/core/$tab", params: { tab: "libraries" } });
    }
  },
  component: CorePage,
});

function CorePage() {
  const { tab: tabParam } = Route.useParams();
  const tab = tabParam as CoreTab;
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

  useEffect(() => {
    setCoreTab(tab);
  }, [tab, setCoreTab]);

  const points = (sources.length ? 1 : 0) + (invites.length ? 1 : 0) + (aiConsent ? 1 : 0) + 1;

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

  const label = (t: CoreTab) =>
    t === "libraries"
      ? "Libraries"
      : t === "sharing"
        ? "Sharing"
        : t === "stewardship"
          ? "Privacy"
          : t === "ai"
            ? "AI"
            : "Operations";

  return (
    <div className="house-page max-w-3xl">
      <header>
        <p className="house-kicker">CINEVO Core</p>
        <h1>Your media. Your rules.</h1>
        <p className="lede">Stacked cards for libraries, sharing, stewardship, AI, and operations.</p>
      </header>
      <nav className="mt-6 flex flex-wrap gap-2" aria-label="Core sections">
        {TABS.map((t) => (
          <Link
            key={t}
            to="/app/core/$tab"
            params={{ tab: t }}
            className={`h-11 rounded-full px-4 font-ui text-sm font-semibold inline-flex items-center ${
              tab === t ? "bg-cine-cyan text-cine-bg" : "bg-cine-surface text-cine-muted"
            }`}
          >
            {label(t)}
          </Link>
        ))}
      </nav>

      <div className="mt-8 space-y-4">
        {tab === "libraries" && (
          <article className="rounded-lg border border-cine-border bg-cine-surface p-5">
            <p className="text-sm text-cine-muted">
              {sources.length
                ? `${sources.length} source${sources.length === 1 ? "" : "s"} connected.`
                : "No sources yet. Folders scan in the browser. Sign in with Plex from Library. Jellyfin uses CINEVO Node."}
            </p>
            {sources.length ? (
              <ul className="mt-4 space-y-2">
                {sources.map((s) => (
                  <li key={s.id} className="rounded-lg bg-cine-well px-3 py-3 font-ui text-sm">
                    <b className="capitalize">{s.name}</b>
                    <span className="ml-2 font-mono text-xs text-cine-faint">
                      {s.kind} · {s.count}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
            <Link to="/app/library" className="mt-4 inline-flex h-11 items-center rounded-md bg-cine-cyan px-5 font-ui font-bold text-cine-bg">
              Open Library
            </Link>
            <div className="mt-6">
              <p className="font-ui text-xs tracking-[0.18em] text-cine-cyan">NODE INSTALLERS</p>
              <InstallerCards />
              <Link to="/connect" className="mt-3 inline-flex h-11 items-center font-ui text-sm font-bold text-cine-cyan">
                Open pairing
              </Link>
            </div>
          </article>
        )}

        {tab === "sharing" && (
          <article className="rounded-lg border border-cine-border bg-cine-surface p-5 space-y-4">
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
                <div key={i.id} className="flex items-center justify-between rounded-lg bg-cine-well px-3 py-3">
                  <span>
                    <b className="font-ui">{i.name}</b>
                    <small className="ml-2 text-cine-faint">
                      {i.status} · {i.days}d · /share/{i.token}
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
                </div>
              ))
            ) : (
              <p className="rounded-lg border border-dashed border-cine-border px-3 py-4 text-sm text-cine-faint">
                No invites yet. Name a friend and create one — nothing is pre-seeded.
              </p>
            )}
          </article>
        )}

        {tab === "stewardship" && (
          <article className="rounded-lg border border-cine-border bg-cine-surface p-5">
            <p className="font-mono text-4xl text-cine-cyan">{points}</p>
            <p className="font-ui text-sm text-cine-muted">stewardship points — for care, not watch-time.</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {["Private index", "Library care", "Invite boundary", "AI consent"].map((lbl, i) => (
                <div key={lbl} className="rounded-lg border border-cine-border bg-cine-well p-3">
                  <b className="font-ui text-sm">{lbl}</b>
                  <p className="text-xs text-cine-faint">{i < points ? "Complete" : "Open"}</p>
                </div>
              ))}
            </div>
          </article>
        )}

        {tab === "ai" && (
          <article className="rounded-lg border border-cine-border bg-cine-surface p-5 space-y-4">
            <label className="flex items-center justify-between gap-4">
              <span>
                <b className="block font-ui text-sm">Consent-led AI</b>
                <small className="text-cine-faint">Nothing leaves until you opt in.</small>
              </span>
              <input
                type="checkbox"
                checked={aiConsent}
                onChange={(e) => setAiConsent(e.target.checked)}
                className="size-5 accent-cine-cyan"
              />
            </label>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void ask();
              }}
              className="flex gap-2"
            >
              <input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                className="h-11 flex-1 rounded-md border border-cine-border bg-cine-well px-3 font-ui"
                placeholder="Ask about titles in this house"
                disabled={!aiConsent}
              />
              <button type="submit" disabled={!aiConsent || pending} className="h-11 rounded-md bg-cine-cyan px-4 font-ui font-bold text-cine-bg">
                {pending ? "…" : "Ask"}
              </button>
            </form>
            {answer ? <p className="text-sm text-cine-muted">{answer}</p> : null}
          </article>
        )}

        {tab === "operations" && (
          <article className="rounded-lg border border-cine-border bg-cine-surface p-5 space-y-3">
            <p className="text-sm text-cine-muted">Pair Node, clear local state, and review installers.</p>
            <Link to="/connect" className="inline-flex h-11 items-center font-ui text-sm font-bold text-cine-cyan">
              Open Connect
            </Link>
            <Link to="/app/settings" className="ml-4 inline-flex h-11 items-center font-ui text-sm font-bold text-cine-cyan">
              Open Settings
            </Link>
          </article>
        )}
      </div>
    </div>
  );
}
