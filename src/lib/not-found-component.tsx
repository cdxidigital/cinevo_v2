import { Link } from "@tanstack/react-router";
import { Film, Home, Search } from "lucide-react";

export function AppNotFoundComponent() {
  return (
    <main className="cinevo-not-found" aria-labelledby="not-found-title">
      <div className="cinevo-not-found__mark" aria-hidden="true">
        <Film className="size-7" strokeWidth={1.6} />
      </div>
      <span className="cinevo-kicker">CINEVO / SIGNAL LOST</span>
      <h1 id="not-found-title">This scene is missing.</h1>
      <p>The page you requested is not in the current cut. Return to the start or browse your collection.</p>
      <div className="cinevo-not-found__actions">
        <Link className="cinevo-action cinevo-action--primary" to="/">
          <Home className="size-4" aria-hidden="true" />
          Back to home
        </Link>
        <Link className="cinevo-action" to="/app">
          <Search className="size-4" aria-hidden="true" />
          Open CINEVO
        </Link>
      </div>
    </main>
  );
}
