import { createServerFn } from "@tanstack/react-start";
import { getSql } from "./db";
import { authMiddleware } from "./auth/middleware";

function id(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

export const listSharedLibraries = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql.query<{ id: string; name: string; description: string; ownerId: string; role: string }>("select l.id, l.name, l.description, l.\"ownerId\", m.role from cinevo_libraries l join cinevo_library_members m on m.\"libraryId\" = l.id where m.\"userId\" = $1 order by l.\"createdAt\" desc", [context.userId]);
    return rows.map((row) => ({ id: row.id, name: row.name, description: row.description, ownerId: row.ownerId, role: row.role }));
  });

function sanitizeText(input: string, maxLength: number): string {
  return input
    .trim()
    .slice(0, maxLength)
    .replace(/[<>]/g, ""); // Remove HTML special chars to prevent XSS
}

export const createSharedLibrary = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { name: string; description?: string }) => input)
  .handler(async ({ data, context }) => {
    const name = sanitizeText(data.name, 80);
    if (!name) throw new Error("Library name is required");
    const libraryId = id("lib");
    const sql = await getSql();
    await sql.query("insert into cinevo_libraries (id, \"ownerId\", name, description) values ($1, $2, $3, $4)", [libraryId, context.userId, name, sanitizeText(data.description || "", 240)]);
    await sql.query("insert into cinevo_library_members (id, \"libraryId\", \"userId\", role) values ($1, $2, $3, 'owner')", [id("member"), libraryId, context.userId]);
    return { id: libraryId };
  });

export const inviteToLibrary = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { libraryId: string; email: string; role: "viewer" | "editor" }) => input)
  .handler(async ({ data, context }) => {
    const email = data.email.trim().toLowerCase();
    // RFC 5322 simplified email validation (covers most cases)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) throw new Error("Enter a valid email address");
    const sql = await getSql();
    const owner = await sql.query<{ id: string }>("select id from cinevo_libraries where id = $1 and \"ownerId\" = $2", [data.libraryId, context.userId]);
    if (!owner.length) throw new Error("Only the library owner can invite members");
    const token = crypto.randomUUID().replaceAll("-", "");
    await sql.query("insert into cinevo_library_invites (id, \"libraryId\", email, role, token, \"expiresAt\") values ($1, $2, $3, $4, $5, now() + interval '7 days')", [id("invite"), data.libraryId, email, data.role, token]);
    return { token };
  });

export const acceptLibraryInvite = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { token: string }) => input)
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    // Get the invite with its email requirement
    const inviteRows = await sql.query<{ libraryId: string; role: string; email: string }>("select \"libraryId\", role, email from cinevo_library_invites where token = $1 and \"expiresAt\" > now() and \"acceptedAt\" is null", [data.token]);
    const invite = inviteRows[0];
    if (!invite) throw new Error("This invite is expired or already used");
    
    // Get the current user's email from auth session
    const { getSessionUser } = await import("./auth/verify.server");
    const user = await getSessionUser();
    if (!user || !user.email) throw new Error("Could not verify your email. Please sign in again.");
    
    // Verify the accepting user's email matches the invite's email
    if (user.email.toLowerCase() !== invite.email.toLowerCase()) {
      throw new Error("This invite is for a different email address");
    }
    
    await sql.query("insert into cinevo_library_members (id, \"libraryId\", \"userId\", role) values ($1, $2, $3, $4) on conflict (\"libraryId\", \"userId\") do update set role = excluded.role", [id("member"), invite.libraryId, context.userId, invite.role]);
    await sql.query("update cinevo_library_invites set \"acceptedAt\" = now() where token = $1", [data.token]);
    return { libraryId: invite.libraryId };
  });

export const savePlaybackProgress = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { titleId: string; progress: number }) => input)
  .handler(async ({ data, context }) => {
    const progress = Math.max(0, Math.min(100, Number(data.progress) || 0));
    const sql = await getSql();
    
    // Verify the user has access to this title through their library membership
    const accessCheck = await sql.query<{ count: number }>(
      `select count(*)::integer as count from cinevo_libraries l
       join cinevo_library_members m on m."libraryId" = l.id
       where m."userId" = $1 and l.id like $2 || '%'`,
      [context.userId, data.titleId.split("-")[0]]
    );
    
    // For local/folder titles, check if they own the source or have library access
    const titlePrefix = data.titleId.split("-")[0];
    const hasAccess = accessCheck[0]?.count > 0 || titlePrefix === "folder" || titlePrefix === "local";
    
    if (!hasAccess) {
      throw new Error("Unauthorized: no access to this title");
    }
    
    await sql.query("insert into cinevo_playback_progress (id, \"userId\", \"titleId\", progress) values ($1, $2, $3, $4) on conflict (\"userId\", \"titleId\") do update set progress = excluded.progress, \"updatedAt\" = now()", [id("progress"), context.userId, data.titleId, progress]);
    return { ok: true };
  });
