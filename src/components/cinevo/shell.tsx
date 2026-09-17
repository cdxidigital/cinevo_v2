import { Film, LibraryBig, Menu, Search, Settings2, Sparkles, Tv, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useCinevo } from "@/lib/cinevo-store";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";

const APP_NAV = [
  { to: "/app/home", label: "Home", icon: Sparkles },
  { to: "/app/movies", label: "Movies", icon: Film },
  { to: "/app/shows", label: "Series", icon: Tv },
  { to: "/app/library", label: "Library", icon: LibraryBig },
] as const;

/** Single top AppNav — URL is canonical; no zustand room for nav. */
export function Shell({
  children,
  overlays,
  variant = "app",
}: {
  children: React.ReactNode;
  overlays?: React.ReactNode;
  variant?: "app" | "marketing";
}) {
  const night = useCinevo((s) => s.prefs.nightMode);
  const zen = useCinevo((s) => s.prefs.zenMode);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [drawer, setDrawer] = useState(false);

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

  const isOn = (to: string) => {
    if (to.includes("$")) {
      const base = to.split("/$")[0];
      return pathname === base || pathname.startsWith(`${base}/`);
    }
    return pathname === to || pathname.startsWith(`${to}/`);
  };
  const isHomeStage = pathname === "/app/home" || pathname === "/app";

  if (variant === "marketing") {
    return (
      <div className={cn("cinevo-house", night && "cinevo-night")}>
        <header className="top-nav" style={{ minHeight: "var(--cine-nav-h)" }}>
          <Link to="/" aria-label="CINEVO home" className="top-nav__brand">
            <Logo size="sm" tagline={false} />
          </Link>
          <nav className="top-nav__links max-md:hidden" aria-label="Main">
            <Link to="/connect" className={cn(isOn("/connect") && "is-on")}>
              Connect
            </Link>
            <Link to="/help" className={cn(isOn("/help") && "is-on")}>
              Help
            </Link>
            <Link to="/login">Log in</Link>
          </nav>
          <div className="top-nav__tools">
            <Link to="/connect" className="top-nav__core max-md:hidden">
              Connect
            </Link>
          </div>
        </header>
        <main className="house-main house-main--page">{children}</main>
        {overlays}
      </div>
    );
  }

  return (
    <div className={cn("cinevo-house", night && "cinevo-night", zen && "cinevo-zen")}>
      <div className="house-still" />
      <div className="house-ambient" />
      <header className="top-nav" style={{ minHeight: "var(--cine-nav-h)" }}>
        <Link to="/app/home" aria-label="CINEVO home" className="top-nav__brand">
          <Logo size="sm" tagline={false} />
        </Link>
        <nav className="top-nav__links max-md:hidden" aria-label="Main">
          {APP_NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(isOn(item.to) && "is-on")}
              aria-current={isOn(item.to) ? "page" : undefined}
            >
              <item.icon aria-hidden="true" />
              {item.label}
            </Link>
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
          <Link to="/app/core/$tab" params={{ tab: "libraries" }} className="top-nav__core max-md:hidden">
            Core
          </Link>
          <Link to="/app/search" aria-label="Search" className="top-nav__icon">
            <Search size={18} />
          </Link>
          <Link to="/app/settings" aria-label="Settings" className="top-nav__icon">
            <Settings2 size={18} />
          </Link>
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
              {APP_NAV.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setDrawer(false)}
                  className={cn(
                    "flex h-11 w-full items-center rounded-md px-3 font-ui text-sm font-medium",
                    isOn(item.to) ? "bg-cine-surface text-cine-text" : "text-cine-muted",
                  )}
                  aria-current={isOn(item.to) ? "page" : undefined}
                >
                  <item.icon aria-hidden="true" />
                  {item.label}
                </Link>
              ))}
              <Link
                to="/app/core/$tab"
                params={{ tab: "libraries" }}
                className="flex h-11 w-full items-center rounded-md px-3 font-ui text-sm font-medium text-cine-muted"
                onClick={() => setDrawer(false)}
              >
                Core
              </Link>
              <Link
                to="/app/search"
                className="flex h-11 w-full items-center rounded-md px-3 font-ui text-sm font-medium text-cine-muted"
                onClick={() => setDrawer(false)}
              >
                Search
              </Link>
              <Link
                to="/app/settings"
                className="flex h-11 w-full items-center rounded-md px-3 font-ui text-sm font-medium text-cine-muted"
                onClick={() => setDrawer(false)}
              >
                Settings
              </Link>
            </nav>
          </aside>
        </div>
      ) : null}

      <main className={cn("house-main", !isHomeStage && "house-main--page")}>{children}</main>
      {overlays}
    </div>
  );
}
