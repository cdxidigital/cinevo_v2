# Security Policy

## Overview

This document outlines security best practices for Cinevo v2, including authentication, data handling, and vulnerability reporting.

## Authentication & Authorization

### Bearer Token Verification

All server functions MUST use `authMiddleware` to verify bearer tokens:

```typescript
import { authMiddleware } from "@/lib/auth/middleware";

export const getMediaLibrary = authMiddleware(async (context) => {
  // context.userId is verified and set
  const userId = context.userId;
  // Your logic here
});
```

**Rules:**
1. ✅ **ALWAYS** wrap server functions with `authMiddleware` if they access user data
2. ❌ **NEVER** trust client-sent user IDs directly
3. ❌ **NEVER** accept unverified bearer tokens from the Authorization header
4. ✅ **ALWAYS** scope database queries by `context.userId`

### Token Expiry & Refresh

- Tokens are issued by Clerk/Better Auth with a TTL (time-to-live)
- Expired tokens are rejected by `authMiddleware`
- Client automatically refreshes before expiry (see `src/lib/auth/client.ts`)
- Server functions return 401 if token is stale

### Session Management

Sessions are stored server-side in the database:

```typescript
// ✅ Secure: session tied to user ID and verified
const session = await db.query.sessions.findFirst({
  where: { userId: context.userId },
});
```

**Rules:**
- Session tokens are HttpOnly cookies (cannot be accessed by JavaScript)
- Session data never includes passwords or sensitive credentials
- Logout clears the session record from the database

## Data Privacy

### User Data

- **PII (Personally Identifiable Information)** — encrypted at rest, never logged
- **OAuth Tokens** — stored server-only, never exposed to the browser
- **API Keys** — injected via environment variables, never hardcoded

### Plex/Jellyfin Library Access

- User must authenticate before accessing library content
- Library metadata is fetched and cached per-user
- Shared libraries are gated by user role/permissions (enforced by Plex/Jellyfin)

### Database Queries

All queries MUST filter by authenticated user:

```typescript
// ❌ WRONG: Fetches all media for all users
const media = await db.select().from(mediaTable);

// ✅ CORRECT: Fetches only this user's media
const media = await db
  .select()
  .from(mediaTable)
  .where(eq(mediaTable.userId, context.userId));
```

## Secrets & Environment Variables

### Safe Storage

- ✅ Store in Vercel Environment Variables (Settings > Environment Variables)
- ✅ Use `.env.example` to document required vars (without values)
- ❌ Do NOT commit `.env` files
- ❌ Do NOT log sensitive values (tokens, keys, passwords)

### Var Naming

- `VITE_*` — Public vars (visible in browser source)
- `DATABASE_URL`, `AUTH_SECRET` — Private vars (server-only)
- `NEXT_PUBLIC_*` — Explicitly public (Vercel convention)

### Audit Secrets

Regularly check for accidental commits:

```bash
# Search recent commits for secrets
git log -p --all | grep -i "secret\|password\|token\|key" | head -20
```

If found, invalidate immediately and rotate.

## Dependency Security

### Check for Vulnerabilities

```bash
npm audit
npm audit fix
```

Run this weekly and address high-severity issues immediately.

### Verify Packages

Before installing a new dependency:
- Check npm registry (`npm info <package>`)
- Review GitHub repo (stars, contributors, recent activity)
- Audit license (GPL, MIT, proprietary?)
- Check for supply-chain attacks (`npm registry <package>` shows download trends)

### Dependency Footprint

Prefer:
- Small, focused packages
- Well-maintained (recent commits)
- Popular and trusted (>100k weekly downloads)

Avoid:
- Abandoned packages (no updates in 2+ years)
- Packages with known vulnerabilities (even if fixable)
- Native modules (`better-sqlite3`) unless necessary

## Network Security

### HTTPS Enforcement

- ✅ All external API calls use HTTPS
- ✅ OAuth redirects use HTTPS and match registered URIs
- ✅ WebSocket connections (if any) use WSS

### CORS Policy

- ✅ Restrict to known origins (Vercel domain)
- ❌ Never use `*` (wildcard)
- ✅ Explicitly list allowed headers and methods

Example (Nitro middleware):

```typescript
// server/middleware/cors.ts
export default defineEventHandler((event) => {
  setHeader(event, "Access-Control-Allow-Origin", "https://cinevo.vercel.app");
  setHeader(event, "Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
});
```

### Input Validation

All server function parameters MUST be validated:

```typescript
import { z } from "zod";

const searchSchema = z.object({
  query: z.string().min(1).max(100),
  limit: z.number().int().min(1).max(50).default(10),
});

export const search = authMiddleware(async (context, input: unknown) => {
  const params = searchSchema.parse(input); // Throws if invalid
  // Use params safely
});
```

## Logging & Monitoring

### What to Log

- ✅ Authentication events (login, logout, token refresh)
- ✅ API errors (with stack trace)
- ✅ Security events (failed auth, rate limit)

### What NOT to Log

- ❌ User passwords or tokens
- ❌ API keys or secrets
- ❌ Full user objects (PII)
- ❌ Database connection strings

Example:

```typescript
// ❌ WRONG
console.log("User login:", user); // User object may contain sensitive fields

// ✅ CORRECT
console.log("User login:", { userId: user.id, email: user.email }); // Explicit fields
```

## Rate Limiting

For endpoints accessed by unauthenticated or public users:

```typescript
// server/middleware/rate-limit.ts
const rateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
});

export default defineEventHandler((event) => {
  if (event.node.req.url?.startsWith("/api/")) {
    rateLimiter(event);
  }
});
```

## Deployment Security

### Vercel Secrets

- All secrets injected at deploy time
- No secrets in source code or `.env`
- Use Vercel's "Secret" type (masked in logs)

### Build-Time Secrets

Never include secrets in the build output:

```typescript
// ❌ WRONG: Available in browser
const API_KEY = process.env.VITE_API_KEY;

// ✅ CORRECT: Server-only
const API_KEY = process.env.API_KEY; // No VITE_ prefix
```

### Prestart Checks

The build process runs security checks:

```bash
npm run check:auth  # Verifies auth middleware usage
npm run typecheck   # Catches type errors (security bugs)
npm run lint        # Catches common vulnerabilities
```

All must pass before deploying.

## Incident Response

### Reporting Vulnerabilities

**Please do NOT open a public GitHub issue** for security vulnerabilities.

Instead, email: `security@cdxidigital.com`

Include:
- Type of vulnerability
- Affected code/endpoint
- Steps to reproduce
- Potential impact
- Suggested fix (optional)

### Response Timeline

- 24 hours: Acknowledge receipt
- 48 hours: Initial assessment
- 7 days: Patch released (if critical)
- 30 days: Full public disclosure (if not critical)

## Checklist for Reviewers

When reviewing code, verify:

- [ ] No hardcoded secrets or API keys
- [ ] All server functions use `authMiddleware` (if accessing user data)
- [ ] Database queries scoped by `context.userId`
- [ ] Input validation via zod or similar
- [ ] No SQL injection vulnerabilities (use Kysely, not string interpolation)
- [ ] No XSS vulnerabilities (React auto-escapes, but check dangerouslySetInnerHTML)
- [ ] HTTPS for external calls
- [ ] Proper error handling (don't expose internals to client)
- [ ] No overly permissive CORS
- [ ] Dependencies are trusted

## Further Reading

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Clerk Authentication Docs](https://clerk.com/docs)
- [Better Auth Docs](https://www.betterauth.dev/)

---

**Last updated:** 2026-09-16  
**Maintainer:** cdxidigital
