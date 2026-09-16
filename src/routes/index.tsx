import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowDownRight, ArrowRight, Check, Play, ShieldCheck, Sparkles } from "lucide-react";
import { InstallerCards } from "@/components/cinevo/installers";
import { Logo } from "@/components/cinevo/logo";

export const Route = createFileRoute("/")({ component: Home });

const NAV = [
  { label: "Home", href: "/" },
  { label: "Your library", to: "/app" as const },
  { label: "Node", to: "/node" as const },
  { label: "CINEVO Core", href: "/app" },
];

const STEPS = [
  { n: "01", t: "Connect a server", d: "Add a folder on this computer, sign in with Plex, or pair CINEVO Node for Jellyfin." },
  { n: "02", t: "Choose sections", d: "Select only the movie and series libraries you want CINEVO to index." },
  { n: "03", t: "Make it yours", d: "Your connected library appears only after your choice. Nothing is published." },
];

const HIGHLIGHTS = [
  {
    n: "01",
    eyebrow: "PRIVATE LIBRARIES",
    title: "Choose exactly what belongs in view.",
    description: "Folders, Plex, or Jellyfin through Node. Select the sections CINEVO may index. Media stays on your machine.",
    action: "Set up libraries",
    to: "/app" as const,
  },
  {
    n: "02",
    eyebrow: "FRIEND SHARING",
    title: "Share with care, never by default.",
    description: "Create time-bound, revocable invitations. The owner’s boundary is visible at every step.",
    action: "Manage sharing",
    to: "/app" as const,
  },
  {
    n: "03",
    eyebrow: "CINEVO CORE",
    title: "A quieter way to care for your collection.",
    description: "Library health, setup, and consent — without turning private media into a social performance.",
    action: "Explore Core",
    to: "/app" as const,
  },
  {
    n: "04",
    eyebrow: "CONSENT-LED AI",
    title: "Thoughtful suggestions on your terms.",
    description: "Ask only the titles already in this house. Nothing leaves until you opt in.",
    action: "See AI controls",
    to: "/app" as const,
  },
];

function Home() {
  return (
    <div className="public-home">
      <header className="public-nav">
        <Link to="/" className="public-brand" aria-label="CINEVO home">
          <Logo size="md" />
        </Link>
        <nav aria-label="Homepage">
          {NAV.map((item) =>
            item.to ? (
              <Link key={item.label} to={item.to}>
                {item.label}
              </Link>
            ) : (
              <a key={item.label} href={item.href}>
                {item.label}
              </a>
            ),
          )}
        </nav>
        <div className="public-nav__actions">
          <Link to="/app" className="public-nav__enter">
            Enter CINEVO <ArrowRight size={14} />
          </Link>
        </div>
      </header>

      <main>
        <section className="public-hero" aria-labelledby="public-hero-title">
          <img src="/stills/hero-theater.jpg" alt="" className="public-hero__still" />
          <div className="public-hero__veil" />
          <div className="public-hero__orb" />
          <div className="public-hero__content">
            <span className="public-kicker">
              <i /> PRIVATE BY DESIGN
            </span>
            <h1 id="public-hero-title">
              Your media.
              <br />
              <em>Your moment.</em>
            </h1>
            <p>
              CINEVO brings every library you control into one considered cinematic space. Create your free account once,
              connect Plex or your friends&apos; servers once, and return to the same collection on every screen.
            </p>
            <div className="public-hero__actions">
              <Link to="/app" className="public-primary">
                <Play size={15} fill="currentColor" /> Create your library
              </Link>
              <Link to="/app" className="public-secondary">
                Open your library <ArrowDownRight size={16} />
              </Link>
            </div>
          </div>
          <div className="public-hero__note">
            <ShieldCheck size={16} />
              <span>
                <b>Connect once. Keep your place.</b>
                <small>Your account remembers Plex, shared servers, libraries, and preferences.</small>
              </span>
          </div>
        </section>

        <section className="home-reel" aria-labelledby="home-reel-title">
          <header>
            <div>
              <span className="public-kicker">START WITH YOUR LIBRARY</span>
              <h2 id="home-reel-title">Nothing appears here until you choose it.</h2>
            </div>
            <p>CINEVO never fills your library with sample media or imported catalogue data.</p>
          </header>
          <div className="home-library-steps">
            {STEPS.map((step) => (
              <article key={step.n}>
                <span>{step.n}</span>
                <h3>{step.t}</h3>
                <p>{step.d}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="home-manifesto" id="libraries">
          <div className="home-manifesto__intro">
            <span className="public-kicker">THE PRIVATE MEDIA OS</span>
            <h2>
              Every library is personal.
              <br />
              <em>So CINEVO starts with permission.</em>
            </h2>
            <p>
              Bring together the media you own and host without turning it into someone else’s platform. Folders on this
              computer. Plex at home or remote. Jellyfin through Node.
            </p>
            <Link to="/app" className="public-text-link">
              Connect a library <ArrowRight size={15} />
            </Link>
          </div>
          <div className="home-manifesto__rules">
            <div>
              <Check size={17} />
              <span>
                <b>Select libraries deliberately</b>
                <small>Choose the individual sections CINEVO can see.</small>
              </span>
            </div>
            <div>
              <Check size={17} />
              <span>
                <b>Keep sharing intentional</b>
                <small>Set library scope and expiry before every invite.</small>
              </span>
            </div>
            <div>
              <Check size={17} />
              <span>
                <b>Stay in control of AI</b>
                <small>Opt in and set the metadata scope for each request.</small>
              </span>
            </div>
          </div>
        </section>

        <section className="home-highlights" id="sharing" aria-labelledby="home-highlights-title">
          <header>
            <span className="public-kicker">A MORE CONSIDERED MEDIA LIFE</span>
            <h2 id="home-highlights-title">
              Everything useful.
              <br />
              Nothing extractive.
            </h2>
          </header>
          <div className="home-highlights__grid">
            {HIGHLIGHTS.map((item) => (
              <Link key={item.n} to={item.to} className="home-highlight">
                <span>{item.n}</span>
                <em>{item.eyebrow}</em>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
                <b>
                  {item.action} <ArrowRight size={14} />
                </b>
              </Link>
            ))}
          </div>
        </section>

        <section className="home-downloads" id="downloads">
          <span className="public-kicker">CINEVO NODE</span>
          <h2 className="mt-4 font-display text-4xl font-bold tracking-tight md:text-5xl">The projector lives at home.</h2>
          <p className="mt-4 mb-10 max-w-xl text-sm text-[#a9a1ae]">
            Install Node on the computer that holds the files. Pair once. Jellyfin and disk paths stay on loopback.
          </p>
          <InstallerCards />
        </section>

        <section className="home-closing">
          <div>
            <Sparkles size={18} className="text-cine-cyan" />
            <span className="public-kicker">CINEMA, REINVENTED</span>
            <h2>
              A home for your
              <br />
              <em>entire world of stories.</em>
            </h2>
          </div>
          <div>
            <p>Connect the library you trust. Choose what CINEVO knows. Then settle in.</p>
            <Link to="/app" className="public-primary">
              Begin with your library <ArrowRight size={16} />
            </Link>
          </div>
        </section>
      </main>

      <footer className="public-footer">
        <Link to="/" className="public-brand">
          <Logo size="md" />
        </Link>
        <p>Your media. Your moment.</p>
        <Link to="/app">
          Open your library <ArrowRight size={13} />
        </Link>
      </footer>
    </div>
  );
}
