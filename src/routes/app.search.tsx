import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { filterCatalog } from "@/lib/catalog";
import { libraryPool, useCinevo } from "@/lib/cinevo-store";

export const Route = createFileRoute("/app/search")({ component: SearchPage });

function SearchPage() {
  const [q, setQ] = useState("");
  const navigate = useNavigate();
  const openTitle = useCinevo((s) => s.openTitle);
  const results = useMemo(
    () => filterCatalog({ query: q, pool: libraryPool() }).slice(0, 40),
    [q],
  );

  return (
    <div className="house-page">
      <header>
        <p className="house-kicker">Search</p>
        <h1>Find a title</h1>
        <p className="lede">Search only what is already indexed in this house.</p>
      </header>
      <label className="mt-6 flex h-12 items-center gap-3 rounded-md border border-cine-border bg-cine-well px-4">
        <Search size={18} className="text-cine-cyan" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Title, genre, year…"
          aria-label="Search library"
          className="min-w-0 flex-1 bg-transparent font-ui outline-none"
          autoFocus
        />
      </label>
      <div className="mt-6 space-y-2">
        {results.map((t) => (
          <button
            key={t.id}
            type="button"
            className="flex w-full items-center gap-3 rounded-lg bg-cine-surface px-3 py-3 text-left"
            onClick={() => {
              openTitle(t.id);
              void navigate({
                to: t.kind === "series" ? "/app/shows/$id" : "/app/movies/$id",
                params: { id: t.id },
              });
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
        {q && !results.length ? (
          <p className="rounded-lg border border-dashed border-cine-border px-3 py-4 text-sm text-cine-faint">
            No matches. Try another spelling, or add a library source.
          </p>
        ) : null}
      </div>
    </div>
  );
}
