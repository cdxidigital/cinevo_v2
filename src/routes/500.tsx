import { createFileRoute, Link } from "@tanstack/react-router";
import { Film, Home, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/500")({
  component: ServerError,
});

function ServerError() {
  return (
    <main className="cinevo-not-found" aria-labelledby="server-error-title">
      <div className="cinevo-not-found__mark" aria-hidden="true">
        <Film className="size-7" strokeWidth={1.6} />
      </div>
      <span className="cinevo-kicker">CINEVO / REEL JAM</span>
      <h1 id="server-error-title">Something tore in the projector.</h1>
      <p>A server error interrupted this scene. Retry, or return home and Connect again.</p>
      <div className="cinevo-not-found__actions">
        <button type="button" className="cinevo-action cinevo-action--primary" onClick={() => window.location.reload()}>
          <RefreshCw className="size-4" aria-hidden="true" />
          Retry
        </button>
        <Link className="cinevo-action" to="/">
          <Home className="size-4" aria-hidden="true" />
          Back to home
        </Link>
        <Link className="cinevo-action" to="/connect">
          Connect
        </Link>
      </div>
    </main>
  );
}
