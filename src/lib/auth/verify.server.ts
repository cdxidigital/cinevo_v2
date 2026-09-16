import { auth, clerkClient } from "@clerk/tanstack-react-start/server";

/**
 * Server-side session resolution (server-only).
 *
 * Clerk resolves the current session from the request context established by
 * Clerk middleware. Never trust a client-supplied user id; only use the verified
 * identity returned by Clerk.
 */

export const authConfigured = true;

/**
 * Thrown by `requireUserId` when the caller has no valid session. Carries
 * `status: 401`; the message is a stable contract — match
 * `err.message === "Unauthorized"` client-side to send the visitor to sign-in.
 */
export class UnauthorizedError extends Error {
  readonly status = 401;
  constructor() {
    super("Unauthorized");
    this.name = "UnauthorizedError";
  }
}

export type VerifiedUser = { id: string; email: string | null };

/**
 * Resolve the signed-in user from the current Clerk request, or `null` when
 * nobody is signed in. Safe to call from server functions and SSR loaders.
 *
 */
export async function getSessionUser(bearerToken?: string): Promise<VerifiedUser | null> {
  const session = await auth({ token: bearerToken });
  if (!session.userId) return null;
  const user = await clerkClient().users.getUser(session.userId);
  return { id: session.userId, email: user.primaryEmailAddress?.emailAddress ?? null };
}

/**
 * Resolve the current user id for a server function, or throw when unauthorized.
 * Prefer `authMiddleware` (`./middleware`), which calls this for you.
 * Throws `UnauthorizedError` when the caller is signed out; otherwise returns
 * the verified Clerk user id.
 */
export async function requireUserId(bearerToken?: string): Promise<string> {
  const user = await getSessionUser(bearerToken);
  if (!user) throw new UnauthorizedError();
  return user.id;
}
