import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { inviteByToken } from "@/lib/cinevo-store";
import { Logo } from "@/components/cinevo/logo";

export const Route = createFileRoute("/share/$token")({
  component: ShareAccept,
});

function ShareAccept() {
  const { token } = Route.useParams();
  const invite = inviteByToken(token);
  return (
    <main className="auth-page">
      <div className="auth-backdrop" />
      <section className="auth-card" aria-labelledby="share-title">
        <Link to="/" className="auth-card__brand">
          <Logo size="sm" tagline={false} />
        </Link>
        <span className="public-kicker">PRIVATE INVITE</span>
        <h1 id="share-title">{invite ? `Join ${invite.name}'s library` : "Accept an invitation"}</h1>
        <p>
          {invite
            ? `This invite is ${invite.status} and lasts ${invite.days} days. Sign in to accept access on this device.`
            : "This invite token was not found on this device. Ask the owner to share again, or sign in if you already accepted elsewhere."}
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <Link to="/login" className="public-primary inline-flex h-11 items-center justify-center gap-2 rounded-md px-4 font-ui font-bold">
            <ShieldCheck size={16} /> Sign in to accept
          </Link>
          <Link to="/connect" className="text-center font-ui text-sm font-bold text-cine-cyan">
            Connect your own Node instead
          </Link>
        </div>
      </section>
    </main>
  );
}
