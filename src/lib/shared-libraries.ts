import { createServerFn } from "@tanstack/react-start";
import { getSql } from "./db";
import { authMiddleware } from "./auth/middleware";

function id(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function requireString(value: unknown, field: string, maxLength: number): string {
  if (typeof value !== "string") throw new Error(`${field} is required`);
  const result = value.trim();
  if (!result || result.length > maxLength) throw new Error(`${field} is invalid`);
  return result;
}

function isEmail(value: string): boolean {
  return value.length <= 254 && /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(value);
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
    const name = sanitizeText(requireString(data.name, "Library name", 80), 80);
    if (!name) throw new Error("Library name is required");
    const description = sanitizeText(typeof data.description === "string" ? data.description : "", 240);
    const libraryId = id("lib");
    const sql = await getSql();
    await sql.query("insert into cinevo_libraries (id, \"ownerId\", name, description) values ($1, $2, $3, $4)", [libraryId, context.userId, name, description]);
    await sql.query("insert into cinevo_library_members (id, \"libraryId\", \"userId\", role) values ($1, $2, $3, 'owner')", [id("member"), libraryId, context.userId]);
    return { id: libraryId };
  });

export const inviteToLibrary = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { libraryId: string; email: string; role: "viewer" | "editor" }) => input)
  .handler(async ({ data, context }) => {
    const email = requireString(data.email, "Email", 254).toLowerCase();
    if (!isEmail(email)) throw new Error("Enter a valid email address");
    const libraryId = requireString(data.libraryId, "Library", 160);
    if (data.role !== "viewer" && data.role !== "editor") throw new Error("Invalid library role");
    const sql = await getSql();
    const owner = await sql.query<{ id: string }>("select id from cinevo_libraries where id = $1 and \"ownerId\" = $2", [libraryId, context.userId]);
    if (!owner.length) throw new Error("Only the library owner can invite members");
    const token = crypto.randomUUID().replaceAll("-", "");
    await sql.query("insert into cinevo_library_invites (id, \"libraryId\", email, role, token, \"expiresAt\") values ($1, $2, $3, $4, $5, now() + interval '7 days')", [id("invite"), libraryId, email, data.role, token]);
    return { token };
  });

export const acceptLibraryInvite = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { token: string }) => input)
  .handler(async ({ data, context }) => {
    const token = requireString(data.token, "Invite token", 128);
    const sql = await getSql();
    const inviteRows = await sql.query<{ libraryId: string; role: string; email: string }>("select \"libraryId\", role, email from cinevo_library_invites where token = $1 and \"expiresAt\" > now() and \"acceptedAt\" is null", [token]);
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
    await sql.query("update cinevo_library_invites set \"acceptedAt\" = now() where token = $1 and \"acceptedAt\" is null", [token]);
    return { libraryId: invite.libraryId };
  });

export const savePlaybackProgress = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { titleId: string; progress: number }) => input)
  .handler(async ({ data, context }) => {
    if (typeof data.titleId !== "string" || !/^(plex|jf|jellyfin|node)-[A-Za-z0-9._:-]{1,240}$/.test(data.titleId)) {
      throw new Error("Invalid title");
    }
    if (typeof data.progress !== "number" || !Number.isFinite(data.progress)) {
      throw new Error("Invalid progress");
    }
    const progress = Math.max(0, Math.min(100, data.progress));
    const sql = await getSql();
    const titlePrefix = data.titleId.slice(0, data.titleId.indexOf("-"));
    if (titlePrefix !== "node") {
      const accessCheck = await sql.query<{ count: number }>(
        `select count(*)::integer as count from cinevo_library_members where "userId" = $1`,
        [context.userId],
      );
      if (!accessCheck[0]?.count) throw new Error("Unauthorized: no library access");
    }
    await sql.query("insert into cinevo_playback_progress (id, \"userId\", \"titleId\", progress) values ($1, $2, $3, $4) on conflict (\"userId\", \"titleId\") do update set progress = excluded.progress, \"updatedAt\" = now()", [id("progress"), context.userId, data.titleId, progress]);
    return { ok: true };
  });
