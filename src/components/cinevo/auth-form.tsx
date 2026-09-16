import { SignIn, SignUp } from "@clerk/tanstack-react-start";
import { Link } from "@tanstack/react-router";

export function AuthPage({ mode }: { mode: "login" | "signup" }) {
  return (
    <main className="auth-page">
      <div className="auth-backdrop" />
      <section className="auth-card" aria-labelledby="auth-title">
        <Link to="/" className="auth-card__brand">CINEVO</Link>
        <span className="public-kicker">PRIVATE BY DESIGN</span>
        <h1 id="auth-title">{mode === "signup" ? "Make room for every story." : "Welcome back to your library."}</h1>
        <p>{mode === "signup" ? "Create one account for your connected Plex libraries, shared access, and playback across every screen." : "Your watch history, connected servers, and shared libraries are waiting."}</p>
        {mode === "signup" ? (
          <SignUp routing="hash" forceRedirectUrl="/app" />
        ) : (
          <SignIn routing="hash" forceRedirectUrl="/app" />
        )}
      </section>
    </main>
  );
}
