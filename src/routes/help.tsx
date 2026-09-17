import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo } from "@/components/cinevo/logo";

export const Route = createFileRoute("/help")({ component: HelpPage });

function HelpPage() {
  return (
    <div className="cinevo-page">
      <nav className="mx-auto flex max-w-3xl items-center justify-between px-5 py-5">
        <Link to="/" className="inline-flex items-center gap-3">
          <Logo size="md" />
        </Link>
        <div className="flex gap-4 font-ui text-sm">
          <Link to="/connect" className="text-cine-cyan font-bold">
            Connect
          </Link>
          <Link to="/login">Log in</Link>
        </div>
      </nav>
      <main className="mx-auto max-w-3xl px-5 py-12">
        <p className="house-kicker">Help</p>
        <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight">Connect · Browse · Play</h1>
        <ol className="mt-8 space-y-6 text-cine-muted">
          <li>
            <b className="text-cine-text">1. Connect</b>
            <p className="mt-1">Install CINEVO Node, open /connect, and enter the pairing code. Or add a folder / Plex from Library.</p>
          </li>
          <li>
            <b className="text-cine-text">2. Browse</b>
            <p className="mt-1">Use Home, Movies, Series, and Library in the top AppNav. Search finds titles already indexed here.</p>
          </li>
          <li>
            <b className="text-cine-text">3. Play</b>
            <p className="mt-1">Open a title, then Play. Watch opens the player over the house. Esc stops playback.</p>
          </li>
        </ol>
        <footer className="mt-16 flex flex-wrap gap-4 border-t border-cine-border pt-6 text-sm text-cine-faint">
          <Link to="/legal/terms">Terms</Link>
          <Link to="/legal/privacy">Privacy</Link>
          <Link to="/">Home</Link>
        </footer>
      </main>
    </div>
  );
}
