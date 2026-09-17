import { Check, ListPlus, Play, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Title } from "@/lib/catalog";
import { useNavigate } from "@tanstack/react-router";
import { useCinevo } from "@/lib/cinevo-store";

export function PosterCard({
  title,
}: {
  title: Title;
  compact?: boolean;
}) {
  const progress = useCinevo((s) => s.progress[title.id]);
  const fav = useCinevo((s) => s.favorites.includes(title.id));
  const navigate = useNavigate();
  const openTitle = useCinevo((s) => s.openTitle);
  const play = useCinevo((s) => s.play);
  const goDetail = () => {
    openTitle(title.id);
    void navigate({
      to: title.kind === "series" ? "/app/shows/$id" : "/app/movies/$id",
      params: { id: title.id },
    });
  };
  const goWatch = () => {
    play(title.id);
    void navigate({ to: "/app/watch/$id", params: { id: title.id } });
  };
  const toggleFavorite = useCinevo((s) => s.toggleFavorite);

  return (
    <article className="group min-w-0">
      <div className="poster-frame rounded-md">
        <button type="button" onClick={goDetail} aria-label={`Open ${title.title}`} className="block w-full">
          <img src={title.poster} alt="" className="aspect-2/3 w-full object-cover" />
        </button>
        <span className="poster-shade" />
        <span className="poster-wash" />
        {progress != null && progress > 0 ? (
          <span className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-0.5 bg-cine-well">
            <i className="block h-full bg-cine-cyan" style={{ width: `${progress}%` }} />
          </span>
        ) : null}
        <button
          type="button"
          aria-label={`Play ${title.title}`}
          onClick={goWatch}
          className="poster-play"
        >
          <Play size={16} fill="currentColor" />
        </button>
      </div>
      <div className="poster-meta mt-2 flex items-start justify-between gap-2">
        <button type="button" onClick={goDetail} className="min-w-0 text-left">
          <h3 className="truncate font-ui text-sm font-semibold tracking-wide">{title.title}</h3>
          <p className="font-mono text-xs text-cine-faint">
            {title.rating > 0 ? (
              <>
                <Star size={10} className="mr-1 inline text-cine-amber" fill="currentColor" />
                {title.rating.toFixed(1)} · {title.year}
              </>
            ) : (
              <>
                {title.sourceLabel || title.source} · {title.year}
              </>
            )}
          </p>
        </button>
        <div className="flex shrink-0">
          <button
            type="button"
            aria-label={fav ? "Remove from My List" : "Add to My List"}
            className={cn(
              "flex size-11 items-center justify-center rounded-md",
              fav ? "text-cine-cyan" : "text-cine-muted hover:text-cine-text",
            )}
            onClick={() => toggleFavorite(title.id)}
          >
            {fav ? <Check size={16} /> : <ListPlus size={16} />}
          </button>
        </div>
      </div>
    </article>
  );
}

export function Rail({
  heading,
  titles,
  empty,
}: {
  heading: string;
  titles: Title[];
  empty?: string;
}) {
  if (!titles.length) {
    if (!empty) return null;
    return (
      <section className="px-1 py-4">
        <h2 className="font-display text-xs font-bold tracking-[0.22em] text-cine-muted">{heading}</h2>
        <p className="mt-2 text-sm text-cine-faint">{empty}</p>
      </section>
    );
  }
  return (
    <section className="space-y-3">
      <header className="flex items-end justify-between">
        <h2 className="font-display text-xl font-extrabold tracking-tight text-cine-text">{heading}</h2>
        <span className="font-mono text-xs text-cine-faint">{titles.length}</span>
      </header>
      <div className="rail-scroll">
        {titles.map((t) => (
          <div key={t.id} className="rail-card">
            <PosterCard title={t} />
          </div>
        ))}
      </div>
    </section>
  );
}
