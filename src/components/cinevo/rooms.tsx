import { Play, Shuffle, Star } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  MOODS,
  byMood,
  filterCatalog,
  genresIn,
  pickFeatured,
  recentlyAdded,
  type Title,
} from "@/lib/catalog";
import { titleById, useCinevo, type Room, type SourceFilter } from "@/lib/cinevo-store";
import { askCinevo } from "@/lib/ask-cinevo";
import { useLibrary } from "@/lib/use-library";
import { PosterCard, Rail } from "./poster";
import { AddLibrary } from "./add-library";

const SOURCES: [SourceFilter, string][] = [
  ["all", "All"],
  ["folder", "Folders"],
  ["plex", "Plex"],
  ["jellyfin", "Jellyfin"],
];

function HeroActions({
  onPlay,
  playLabel,
  onMore,
  moreLabel = "More info",
  extra,
  playIcon = true,
}: {
  onPlay: () => void;
  playLabel: string;
  onMore: () => void;
  moreLabel?: string;
  extra?: React.ReactNode;
  playIcon?: boolean;
}) {
  return (
    <div className="house-actions">
      <button type="button" onClick={onPlay} className="house-btn house-btn--play">
        {playIcon ? <Play size={16} fill="currentColor" /> : null} {playLabel}
      </button>
      <button type="button" onClick={onMore} className="house-btn house-btn--ghost">
        {moreLabel}
      </button>
      {extra}
    </div>
  );
}

function PlatformArc() {
  const navigate = useNavigate();
  const cards = [
    {
      title: "Private libraries",
      copy: "Folders on this computer, Plex on any server you own or share, Jellyfin through Node.",
      action: "Open",
      onClick: () => void navigate({ to: "/app/library" }),
    },
    {
      title: "Friend sharing",
      copy: "Invite-only access with a name, a window, and a revoke button.",
      action: "Share",
      onClick: () => void navigate({ to: "/app/core/$tab", params: { tab: "sharing" } }),
    },
    {
      title: "Library care",
      copy: "Stewardship for the collection. No watch-time scores. No social pressure.",
      action: "Review",
      onClick: () => void navigate({ to: "/app/core/$tab", params: { tab: "stewardship" } }),
    },
    {
      title: "Consent-led AI",
      copy: "Ask the titles already in this house. Nothing leaves until you opt in.",
      action: "Ask",
      onClick: () => void navigate({ to: "/app/core/$tab", params: { tab: "ai" } }),
    },
  ];
  return (
    <section className="platform-arc">
      <header>
        <p className="house-kicker">Your private media OS</p>
        <h2>
          Thoughtfully organised.
          <br />
          Entirely yours.
        </h2>
        <p>CINEVO keeps the libraries you control in one house — folders, Plex, Node — without ads or a public feed.</p>
      </header>
      <div className="platform-arc__grid">
        {cards.map((card) => (
          <button key={card.title} type="button" className="arc-card" onClick={card.onClick}>
            <b>{card.title}</b>
            <span>{card.copy}</span>
            <i>{card.action}</i>
          </button>
        ))}
      </div>
    </section>
  );
}

export function StageRoom() {
  const play = useCinevo((s) => s.play);
  const openTitle = useCinevo((s) => s.openTitle);
  const progress = useCinevo((s) => s.progress);
  const favorites = useCinevo((s) => s.favorites);
  const tonight = useCinevo((s) => s.tonight);
  const mood = useCinevo((s) => s.mood);
  const shufflePlay = useCinevo((s) => s.shufflePlay);
  const navigate = useNavigate();
  const aiConsent = useCinevo((s) => s.aiConsent);
  const sourceFilter = useCinevo((s) => s.sourceFilter);
  const setSourceFilter = useCinevo((s) => s.setSourceFilter);
  const sources = useCinevo((s) => s.sources);
  const library = useLibrary();
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [pending, setPending] = useState(false);

  const filtered = useMemo(() => {
    if (sourceFilter === "all") return library;
    return library.filter((t) => t.source === sourceFilter);
  }, [library, sourceFilter]);

  const pool = byMood(mood, filtered);
  const hero = pickFeatured({ mood, progress, tonight, pool: filtered });
  const heroProgress = hero ? progress[hero.id] ?? 0 : 0;
  const continueWatching = filtered.filter((t) => {
    const p = progress[t.id];
    return p != null && p > 0 && p < 100;
  });
  const added = recentlyAdded(8, pool);
  const addedIds = new Set(added.map((t) => t.id));
  const myList = filtered.filter((t) => favorites.includes(t.id));
  const suggestions = pool.filter((t) => !favorites.includes(t.id) && !addedIds.has(t.id)).slice(0, 8);
  const moodMeta = MOODS.find((m) => m.id === mood) ?? MOODS[0];
  const queued = tonight
    .map((id) => titleById(id))
    .filter((t): t is Title => Boolean(t));

  const ask = async () => {
    if (!question.trim() || pending) return;
    if (!aiConsent) {
      void navigate({ to: "/app/core/$tab", params: { tab: "ai" } });
      return;
    }
    setPending(true);
    try {
      const res = await askCinevo({
        data: {
          question,
          titles: pool.map((t) => ({
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
      else setAnswer(res.error);
    } finally {
      setPending(false);
    }
  };

  const still = hero?.still || "/stills/hero-theater.jpg";

  return (
    <div>
      <section className="house-hero" aria-labelledby="featured-title">
        <img src={still} alt="" className="house-hero__art" />
        <div className="house-hero__shade" />
        <div className="house-hero__copy">
          <p className="house-kicker">{hero ? "Featured for your night" : "Private by design"}</p>
          <h1 id="featured-title">{hero ? hero.title : "Your media. Your moment."}</h1>
          {hero ? (
            <>
              <p className="house-meta">
                <span>{hero.year}</span>
                <i />
                <span>{hero.runtime}</span>
                <i />
                <span>{hero.genre}</span>
                {hero.rating > 0 ? (
                  <>
                    <i />
                    <span>
                      <Star size={12} className="inline text-cine-amber" fill="currentColor" /> {hero.rating.toFixed(1)}
                    </span>
                  </>
                ) : null}
              </p>
              <p className="lede">{hero.synopsis}</p>
              <HeroActions
                onPlay={() => play(hero.id)}
                playLabel={heroProgress > 0 && heroProgress < 100 ? "Resume" : "Play now"}
                onMore={() => openTitle(hero.id)}
                extra={
                  <button type="button" onClick={shufflePlay} className="house-btn house-btn--ghost">
                    <Shuffle size={16} /> Surprise me
                  </button>
                }
              />
            </>
          ) : (
            <>
              <p className="lede">
                Start with a folder on this computer, or sign in with Plex to see every server on your account — home,
                shared, remote.
              </p>
              <HeroActions
                onPlay={() => void navigate({ to: "/app/library" })}
                playLabel="Add library"
                playIcon={false}
                onMore={() => void navigate({ to: "/app/core/$tab", params: { tab: "libraries" } })}
                moreLabel="Open Core"
              />
            </>
          )}
        </div>
      </section>

      <div className="house-stage">
        {library.length ? (
          <>
            {sources.length > 1 ? (
              <div className="house-sources" role="tablist" aria-label="Sources">
                {SOURCES.map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={sourceFilter === id}
                    onClick={() => setSourceFilter(id)}
                    className={sourceFilter === id ? "house-chip is-on" : "house-chip"}
                  >
                    {label}
                  </button>
                ))}
              </div>
            ) : null}

            <div className="house-board">
              <aside className="house-panel">
                <header>
                  <span>Tonight</span>
                  <small className="font-mono text-xs text-cine-faint">{tonight.length}/8</small>
                </header>
                {queued.length ? (
                  <ol className="house-queue">
                    {queued.map((t, i) => (
                      <li key={t.id}>
                        <button type="button" onClick={() => play(t.id)} aria-label={`Play ${t.title}`}>
                          <span className="house-queue__n">{String(i + 1).padStart(2, "0")}</span>
                          <img src={t.poster} alt="" />
                          <span>
                            <b>{t.title}</b>
                            <small>
                              {t.runtime} · {progress[t.id] ?? 0}% watched
                            </small>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="mt-4 px-1 text-sm text-cine-faint">Queue a title from any poster. It stays on this device.</p>
                )}
              </aside>
              <section className="house-spot">
                <p className="house-kicker">Now browsing</p>
                <h2>{moodMeta.hint}</h2>
                <p>Curated from titles already in this library. Nothing is uploaded.</p>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void ask();
                  }}
                >
                  <input
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    maxLength={400}
                    placeholder="What should I watch tonight?"
                    aria-label="Ask CINEVO"
                  />
                  <button type="submit" disabled={pending} className="house-btn house-btn--play">
                    {pending ? "Thinking…" : "Ask"}
                  </button>
                </form>
                {answer ? <p className="relative z-10 mt-3 text-sm text-cine-muted">{answer}</p> : null}
              </section>
            </div>

            <div className="house-rails">
              {continueWatching.length ? <Rail heading="Continue watching" titles={continueWatching} /> : null}
              {added.length ? <Rail heading="Recently added" titles={added} /> : null}
              {suggestions.length ? <Rail heading="You might like" titles={suggestions} /> : null}
              {myList.length ? <Rail heading="My List" titles={myList} /> : null}
            </div>
          </>
        ) : null}
        <PlatformArc />
      </div>
    </div>
  );
}

export function BrowseRoom({ kind: initialKind = "all" }: { kind?: "all" | "movie" | "series" }) {
  const [kind, setKind] = useState<"all" | "movie" | "series">(initialKind);
  const [genre, setGenre] = useState("All");
  useEffect(() => {
    setKind(initialKind);
    setGenre("All");
  }, [initialKind]);
  const library = useLibrary();
  const titles = useMemo(() => filterCatalog({ kind, genre, pool: library }), [kind, genre, library]);
  const genres = genresIn(library);
  const heading = initialKind === "movie" ? "Movies" : initialKind === "series" ? "TV Shows" : "Browse";
  return (
    <div className="house-page">
      <header>
        <p className="house-kicker">Your library</p>
        <h1>{heading}</h1>
        <p className="lede">Find something worth disappearing into.</p>
      </header>
      <div className="house-sources mb-4">
        {(["all", "movie", "series"] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            className={kind === k ? "house-chip is-on" : "house-chip"}
          >
            {k === "all" ? "All" : k === "movie" ? "Movies" : "Series"}
          </button>
        ))}
      </div>
      <div className="house-sources mb-8">
        {genres.map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => setGenre(g)}
            className={genre === g ? "house-chip is-on" : "house-chip"}
          >
            {g}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {titles.map((t) => (
          <PosterCard key={t.id} title={t} />
        ))}
      </div>
      {!titles.length ? (
        <p className="mt-6 text-sm text-cine-faint">No titles yet. Add a folder or sign in with Plex.</p>
      ) : null}
    </div>
  );
}

export function SidebarRoom() {
  const local = useCinevo((s) => s.localTitles);
  const remote = useCinevo((s) => s.remoteTitles);
  const yours = [...local, ...remote];
  return (
    <div className="house-page">
      <header>
        <p className="house-kicker">Home library</p>
        <h1>Add sources</h1>
        <p className="lede">
          Folders scan in this browser. Sign in with Plex to see every server on your account — home, shared, remote.
          Jellyfin still pairs through CINEVO Node.
        </p>
      </header>
      <AddLibrary />
      {yours.length ? (
        <div className="mt-10">
          <Rail heading="In your library" titles={yours.slice(0, 12)} />
        </div>
      ) : null}
    </div>
  );
}

export function RoomSwitch({ room }: { room: Room }) {
  switch (room) {
    case "browse":
      return <BrowseRoom />;
    case "movies":
      return <BrowseRoom kind="movie" />;
    case "shows":
      return <BrowseRoom kind="series" />;
    case "sidebar":
      return <SidebarRoom />;
    default:
      return <StageRoom />;
  }
}
