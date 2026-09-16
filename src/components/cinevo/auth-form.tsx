import { FormEvent, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, LockKeyhole, Mail, UserRound } from "lucide-react";
import { GROK_PROVIDERS, signIn as signInWithProvider, authClient } from "@/lib/auth/client";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const isSignup = mode === "signup";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const result = isSignup
        ? await authClient.signUp.email({ name: name.trim(), email: email.trim(), password })
        : await authClient.signIn.email({ email: email.trim(), password });
      if (result.error) {
        setError("We could not complete that request. Check your details and try again.");
        return;
      }
      await navigate({ to: "/app" });
    } catch {
      setError("We could not reach CINEVO. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  async function startSocial(providerId: string) {
    setPending(true);
    setError("");
    try {
      await signInWithProvider(providerId, { callbackURL: "/app", errorCallbackURL: window.location.pathname });
    } catch (socialError) {
      setPending(false);
      setError(socialError instanceof Error ? socialError.message : "Social sign-in could not be started.");
    }
  }

  return (
    <form className="auth-form" onSubmit={submit}>
      <div className="auth-socials" aria-label="Social sign-in options">
        {GROK_PROVIDERS.map((provider) => (
          <button
            className="auth-social"
            key={provider.providerId}
            type="button"
            onClick={() => void startSocial(provider.providerId)}
            disabled={pending}
          >
            Continue with {provider.label}
          </button>
        ))}
      </div>
      <div className="auth-divider"><span>or use email</span></div>
      {isSignup ? (
        <label>
          <span>Name</span>
          <div className="auth-field"><UserRound size={16} /><input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" required /></div>
        </label>
      ) : null}
      <label>
        <span>Email</span>
        <div className="auth-field"><Mail size={16} /><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></div>
      </label>
      <label>
        <span>Password</span>
        <div className="auth-field"><LockKeyhole size={16} /><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={isSignup ? "new-password" : "current-password"} minLength={8} required /></div>
      </label>
      {error ? <p className="auth-error" role="alert">{error}</p> : null}
      <button className="public-primary auth-submit" type="submit" disabled={pending}>
        {pending ? "Opening CINEVO…" : isSignup ? "Create account" : "Log in"} <ArrowRight size={15} />
      </button>
      <p className="auth-switch">
        {isSignup ? "Already have an account?" : "New to CINEVO?"}{" "}
        <Link to={isSignup ? "/login" : "/signup"}>{isSignup ? "Log in" : "Create an account"}</Link>
      </p>
    </form>
  );
}

export function AuthPage({ mode }: { mode: "login" | "signup" }) {
  const isSignup = mode === "signup";
  return (
    <main className="auth-page">
      <div className="auth-backdrop" />
      <section className="auth-card" aria-labelledby="auth-title">
        <Link to="/" className="auth-card__brand">CINEVO</Link>
        <span className="public-kicker">PRIVATE BY DESIGN</span>
        <h1 id="auth-title">{isSignup ? "Make room for every story." : "Welcome back to your library."}</h1>
        <p>{isSignup ? "Create one account for your connected Plex libraries, shared access, and playback across every screen." : "Your watch history, connected servers, and shared libraries are waiting."}</p>
        <AuthForm mode={mode} />
      </section>
    </main>
  );
}
