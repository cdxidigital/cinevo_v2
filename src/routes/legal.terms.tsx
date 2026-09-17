import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo } from "@/components/cinevo/logo";

export const Route = createFileRoute("/legal/terms")({ component: TermsPage });

function TermsPage() {
  return (
    <div className="cinevo-page">
      <nav className="mx-auto flex max-w-3xl items-center justify-between px-5 py-5">
        <Link to="/">
          <Logo size="sm" tagline={false} />
        </Link>
        <Link to="/legal/privacy" className="font-ui text-sm text-cine-cyan">
          Privacy
        </Link>
      </nav>
      <main className="mx-auto max-w-3xl px-5 py-12 prose-invert">
        <h1 className="font-display text-3xl font-extrabold">Terms of use</h1>
        <p className="mt-4 text-cine-muted">
          CINEVO is a private media interface. You are responsible for the libraries you connect and the rights to play
          that media. Do not use CINEVO to redistribute copyrighted works without authorization.
        </p>
        <p className="mt-4 text-cine-muted">
          Accounts, invites, and Node pairing are provided as-is. We may update these terms; continued use means you
          accept the current version.
        </p>
        <footer className="mt-12 flex gap-4 text-sm text-cine-faint">
          <Link to="/">Home</Link>
          <Link to="/help">Help</Link>
        </footer>
      </main>
    </div>
  );
}
