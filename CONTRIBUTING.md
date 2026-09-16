# Contributing to Cinevo v2

Thank you for helping improve Cinevo! This guide covers development practices, code style, and the review process.

## Development Setup

```bash
git clone https://github.com/cdxidigital/cinevo_v2.git
cd cinevo_v2
npm install
npm run dev
```

Visit `http://localhost:8080` to see your changes live.

## Code Quality

All commits must pass these gates:

### 1. Linting

```bash
npm run lint          # Check for violations
npm run format        # Auto-fix formatting
```

**Rules:**
- React Hooks linting (`react-hooks/rules-of-hooks`)
- React Refresh exports (`react-refresh/only-export-components`)
- Unused vars (prefixed with `_` are ignored)
- TypeScript strict mode (no `any` escapes without reason)
- Prettier formatting (100 char line width, trailing commas, double quotes)

### 2. Type Checking

```bash
npm run typecheck
```

Must pass with **zero errors**. If you have a legitimate `any`, add a comment:

```typescript
// @ts-expect-error — library lacks types
const result = externalLib.call();
```

### 3. Building

```bash
npm run build         # Production build
npm run test          # Unit tests
```

Both must succeed before merging to `main`.

### 4. Visual Regression Testing

```bash
node scripts/browser-smoke.mjs
```

Run this **before** and **after** UI changes:
- Desktop viewport must render visible content
- Mobile viewport (390×844) must have no overflow
- Browser console must have zero errors

## Code Style

### TypeScript

- Use `const` by default, `let` only when reassigned
- Type annotations on function signatures (no implicit `any`)
- Interfaces over types for object shapes
- Use discriminated unions for error handling

```typescript
// ✅ Good
interface AuthResult {
  success: true;
  token: string;
} | {
  success: false;
  error: string;
}

function signIn(email: string): Promise<AuthResult> {
  // ...
}
```

### React Components

- Functional components only (hooks-based)
- Keep components under 200 lines; extract subcomponents if larger
- Memoize callbacks used in dependency arrays (`useCallback`)
- Use zustand for cross-component state, `useState` for local UI state

```typescript
// ✅ Good
export function MediaGrid() {
  const items = useMediaStore((s) => s.items);
  const [sortBy, setSortBy] = useState<"name" | "date">("name");
  
  return (
    <div>
      {/* content */}
    </div>
  );
}
```

### File Organization

```
src/
  routes/
    [routePath].tsx          # One component per file if possible
  components/
    [FeatureName]/
      [Component].tsx        # Grouped by feature, not type
      [Component].test.tsx
      index.ts               # Named exports only
  lib/
    [domain]/                # auth/, db/, app-data/, etc.
      [module].ts
      [module].test.ts
```

### Naming Conventions

- Components: PascalCase (`MediaCard.tsx`)
- Functions/vars: camelCase (`fetchMetadata()`)
- Constants: UPPER_SNAKE_CASE (`MAX_RESULTS = 50`)
- Files: kebab-case or PascalCase (match export)
- React Query keys: `['domain', 'resource', id]` tuple

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat` — New feature
- `fix` — Bug fix
- `docs` — Documentation only
- `style` — Code style (formatting, semicolons)
- `refactor` — Code reorganization (no logic change)
- `perf` — Performance improvement
- `test` — Add/update tests
- `chore` — Dependencies, scripts, config

### Examples

```
feat(auth): add bearer token verification to middleware

Previously, server functions accepted any Authorization header.
Now they verify JWT tokens and reject expired credentials.

Closes #42
```

```
fix(ui): prevent modal overflow on mobile viewport

The media detail modal now respects max-height and scrolls
on devices with limited vertical space (e.g., landscape tablet).

Related: #38
```

## Pull Request Workflow

1. **Create a branch** off `main`:
   ```bash
   git checkout -b fix/auth-token-expiry
   ```

2. **Make changes** and commit with clear messages:
   ```bash
   git add .
   git commit -m "fix(auth): prevent stale tokens in server functions"
   ```

3. **Push and open a PR**:
   ```bash
   git push origin fix/auth-token-expiry
   ```

4. **PR Description** should include:
   - What changed and why
   - How to test the change
   - Screenshots (if UI changes)
   - Closes #XXX (link any issues)

5. **Wait for checks**:
   - ✅ ESLint + Prettier
   - ✅ TypeScript typecheck
   - ✅ `npm run build`
   - ✅ Vercel preview deploy

6. **Address feedback** — Reviewers may request changes. Push new commits to the same branch.

7. **Merge** — Once approved, use **Squash and Merge** to keep history clean.

## Review Checklist

When reviewing PRs, confirm:

- [ ] Code follows style guide (run `npm run format` locally to verify)
- [ ] No new TypeScript errors (`npm run typecheck`)
- [ ] No console errors in browser (check smoke test)
- [ ] Mobile viewport tested (no horizontal scroll)
- [ ] Commit messages follow Conventional Commits
- [ ] Resolves the linked issue or explains why it doesn't
- [ ] No hardcoded secrets or sensitive data
- [ ] Dependency changes are justified (bloat = slower cold-start)

## Security Considerations

- **Never** commit `.env`, API keys, or tokens
- **Always** validate bearer tokens server-side (`authMiddleware`)
- **Sanitize** user input before rendering or storing
- **Check** dependency advisories: `npm audit`
- **Verify** OAuth redirects use HTTPS and match registered URIs

## Testing

### Unit Tests

Place tests alongside their module:

```typescript
// src/lib/auth/verify-token.test.ts
import { verifyToken } from "./verify-token";

describe("verifyToken", () => {
  it("accepts valid JWT", () => {
    const result = verifyToken(validJwt);
    expect(result.success).toBe(true);
  });

  it("rejects expired token", () => {
    const result = verifyToken(expiredJwt);
    expect(result.success).toBe(false);
  });
});
```

Run with:
```bash
npm run test
```

### Integration Tests

For server functions, use `agent-browser` CLI (see `.grok/references/browser-qa.md`):

```bash
agent-browser click "button:has-text('Sign In')"
agent-browser type "email@example.com"
agent-browser press "Enter"
```

## Performance Checklist

- [ ] Images are optimized (use WebP, compress)
- [ ] No unused dependencies in `package.json`
- [ ] Server functions cache database queries
- [ ] React components memoized if they cause re-renders
- [ ] CSS is bundled (no inline `<style>` tags)
- [ ] No N+1 database queries (use batch queries)

## Questions?

Open an issue or ask in the team channel. We're here to help!

---

**Happy coding!** 🚀
