# Cinevo v2

A **Plex/Jellyfin media streaming companion** built with **React 19**, **TanStack Start**, and **Capacitor** for seamless playback across web, Android TV, and mobile devices.

## Features

- 🎬 **Plex/Jellyfin Integration** — Browse and stream private media libraries
- 📱 **Cross-Platform** — Web (React SSR), Android TV, mobile (Capacitor)
- 🔐 **Secure Auth** — Clerk/Better Auth with bearer token verification
- 🎨 **Plex-Inspired UI** — Tailwind + Radix components, dark-mode ready
- 📊 **Real-Time Data** — TanStack Query for efficient API sync
- 🛠️ **CLI Tool** — CINEVO Node for loopback-only library bridging

## Quick Start

### Prerequisites

- **Node.js 22+** (required)
- **npm** (bundled with Node)

### Development

```bash
# Install dependencies
npm install

# Start dev server (runs on 0.0.0.0:8080)
npm run dev

# Open browser to http://localhost:8080
```

### Testing & Quality

```bash
# Run linter & fix violations
npm run lint
npm run format

# Type-check (no emit)
npm run typecheck

# Run unit tests
npm run test

# Visual smoke test (desktop & mobile)
node scripts/browser-smoke.mjs
```

### Production Build

```bash
# Build for Vercel/production
npm run build

# Preview built output locally (127.0.0.1:8081)
npm run preview:restart

# Stop preview server
npm run preview:stop
```

## Project Structure

```
src/
  routes/           File-based routing (TanStack Router)
  lib/
    auth/           Clerk/Better Auth integration
    db.ts           PGLite + Kysely database layer
    app-data/       User data & OAuth connectors
  styles.css        Tailwind entry

server/
  middleware/       Nitro SSR middleware (PWA, auth popups)

migrations/         Database schema (PGLite SQL)

nodes/
  cinevo-node/      Node.js CLI tool for library bridging

android/           Capacitor Android project (TV + Phone)

scripts/            Build utilities & QA automation

.grok/              App Builder workspace config
```

## Auth & Database

- **Auth:** OFF by default. Enable via `.grok/app-env.json` (`VITE_AUTH_ENABLED=true`)
- **Database:** PGLite (in-process PostgreSQL). Migrations run on build.
- **Token Verification:** Bearer tokens validated on every server function (see `src/lib/auth/middleware.ts`)

## Mobile

### Build APK

```bash
# Build web assets, sync to Android, and compile APK
npm run mobile:apk          # Phone
npm run mobile:tv-apk       # Android TV
```

### Open in Android Studio

```bash
npm run mobile:open
```

## CLI Tool (CINEVO Node)

Standalone Node.js executable for loopback-only Plex/Jellyfin integration.

```bash
cd nodes/cinevo-node
npm install
npm run pack:nodes        # Builds cross-platform binaries (win, macos, linux)
```

Outputs to `nodes/cinevo-node/dist/`.

## Environment Variables

The app uses `VITE_`-prefixed vars only (browser-safe). On Vercel, add:

- `VITE_AUTH_ENABLED` — Enable user accounts (default: false)
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` — Clerk public key (auth-only)

**Do not commit `.env` files.** Use `.env.example` for documentation.

## Deployment

Deploys to **Vercel** via merge to `main` branch.

- **Build command:** `npm run build`
- **Start command:** N/A (SSR via Vercel Functions)
- **Build output:** `.output/` (Nitro)

**Security:**
- Database URL injected by Vercel (never hardcoded)
- Auth tokens server-only
- No runtime filesystem writes
- All secrets gated behind `.grok/app-env.json`

## Architecture

### Request Flow (Dev)

1. Vite dev server (`:8080`) auto-discovers `src/routes/`
2. TanStack Start SSR renders React
3. OAuth popups handled by `vite.config.ts` middleware
4. Better Auth sessions stored server-side
5. PGLite initialized on first query

### Request Flow (Production)

1. Vercel receives request
2. Nitro (`.output/`) handles SSR + API
3. Server functions validated with `authMiddleware`
4. Database migrations auto-applied on deploy
5. PWA manifest + install tutorial served on demand

## Git Workflow

1. Feature branches off `main` → PR
2. Auto-deploys on merge (Vercel)
3. ESLint, TypeScript, and build gates must pass
4. Use `npm run format` before committing

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Blank page on `npm run dev` | Check `/tmp/app-startup.log` for errors |
| "Cannot find module" | Run `npm install` and restart dev server |
| Type errors but builds OK | Run `npm run typecheck` to see strict errors |
| Mobile APK fails | Ensure `npm run mobile:web` completes, then try `npm run mobile:apk` |
| Bearer token errors | Verify `VITE_AUTH_ENABLED` is set and token in Authorization header is fresh |

## Contributing

See `CONTRIBUTING.md` for guidelines.

## Security

See `.github/SECURITY.md` for auth best practices and vulnerability reporting.

## License

Proprietary — cdxidigital
