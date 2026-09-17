import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo } from "@/components/cinevo/logo";

export const Route = createFileRoute("/legal/privacy")({ component: PrivacyPage });

function PrivacyPage() {
  return (
    <div className="cinevo-page">
      <nav className="mx-auto flex max-w-3xl items-center justify-between px-5 py-5">
        <Link to="/">
          <Logo size="sm" tagline={false} />
        </Link>
        <Link to="/legal/terms" className="font-ui text-sm text-cine-cyan">
          Terms
        </Link>
      </nav>
      <main className="mx-auto max-w-3xl px-5 py-12">
        <h1 className="font-display text-3xl font-extrabold">Privacy</h1>
        <p className="mt-4 text-cine-muted">
          Media stays on your machines. Local prefs and indexes are stored in this browser unless you sign in and sync
          account state. AI features only run after explicit consent and only against titles already in your library.
        </p>
        <p className="mt-4 text-cine-muted">
          Auth uses Clerk when configured. We do not sell your watch history. Clear local data anytime in Settings.
        </p>
        <footer className="mt-12 flex gap-4 text-sm text-cine-faint">
          <Link to="/">Home</Link>
          <Link to="/help">Help</Link>
        </footer>
      </main>
    </div>
  );
}
