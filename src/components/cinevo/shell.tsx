import { Menu, Palette, Search, Settings2, Sparkles, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useCinevo, type Room } from "@/lib/cinevo-store";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";

const NAV: { id: Room; label: string; icon: typeof Sparkles }[] = [
  { id: "stage", label: "Home", icon: Sparkles },
  { id: "movies", label: "Movies", icon: Palette },
  { id: "shows", label: "Series", icon: Palette },
  { id: "sidebar", label: "Library", icon: Palette },
];

export function Shell({
  children,
  overlays,
}: {
  children: React.ReactNode;
  overlays?: React.ReactNode;
}) {
  const room = useCinevo((s) => s.room);
  const setRoom = useCinevo((s) => s.setRoom);
  const setSearchOpen = useCinevo((s) => s.setSearchOpen);
  const setSettingsOpen = useCinevo((s) => s.setSettingsOpen);
  const setCoreOpen = useCinevo((s) => s.setCoreOpen);
  const night = useCinevo((s) => s.prefs.nightMode);
  const zen = useCinevo((s) => s.prefs.zenMode);
  const [drawer, setDrawer] = useState(false);

  useEffect(() => {
    if (!NAV.some((item) => item.id === room)) setRoom("stage");
  }, [room, setRoom]);

  useEffect(() => {
    if (!drawer) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawer(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [drawer]);

  const go = (id: Room) => {
    setRoom(id);
    setDrawer(false);
  };

  return (
    <div className={cn("cinevo-house", night && "cinevo-night", zen && "cinevo-zen")}>
      <div className="house-still" />
      <div className="house-ambient" />
      <header className="top-nav">
        <Link to="/" aria-label="CINEVO home" className="top-nav__brand">
          <Logo size="sm" tagline={false} />
        </Link>
        <nav className="top-nav__links max-md:hidden" aria-label="Main">
          {NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => go(item.id)}
              className={cn(room === item.id && "is-on")}
              aria-current={room === item.id ? "page" : undefined}
            >
              <item.icon aria-hidden="true" />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="top-nav__tools">
          <button
            type="button"
            className="top-nav__icon md:hidden"
            aria-label="Open menu"
            onClick={() => setDrawer(true)}
          >
            <Menu size={18} />
          </button>
          <button type="button" className="top-nav__core max-md:hidden" onClick={() => setCoreOpen(true)}>
            Core
          </button>
          <button type="button" aria-label="Search" className="top-nav__icon" onClick={() => setSearchOpen(true)}>
            <Search size={18} />
          </button>
          <button
            type="button"
            aria-label="Settings"
            className="top-nav__icon"
            onClick={() => setSettingsOpen(true)}
          >
            <Settings2 size={18} />
          </button>
        </div>
      </header>

      {drawer ? (
        <div className="drawer-scrim md:hidden" onMouseDown={() => setDrawer(false)}>
          <aside className="drawer-panel" onMouseDown={(e) => e.stopPropagation()}>
            <div className="mb-6 flex items-center justify-between">
              <Logo size="sm" />
              <button type="button" aria-label="Close menu" className="top-nav__icon" onClick={() => setDrawer(false)}>
                <X size={18} />
              </button>
            </div>
            <nav className="flex flex-col gap-1" aria-label="Main">
              {NAV.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => go(item.id)}
                  className={cn(
                    "flex h-11 w-full items-center rounded-md px-3 font-ui text-sm font-medium",
                    room === item.id ? "bg-cine-surface text-cine-text" : "text-cine-muted",
                  )}
                  aria-current={room === item.id ? "page" : undefined}
                >
                  <item.icon aria-hidden="true" />
                  {item.label}
                </button>
              ))}
              <button
                type="button"
                className="flex h-11 w-full items-center rounded-md px-3 font-ui text-sm font-medium text-cine-muted"
                onClick={() => {
                  setCoreOpen(true);
                  setDrawer(false);
                }}
              >
                Core
              </button>
            </nav>
          </aside>
        </div>
      ) : null}

      <main className={cn("house-main", room !== "stage" && "house-main--page")}>{children}</main>
      {overlays}
    </div>
  );
}
