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
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
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
  .validator((input: { name: string; description?: string }) => {
    if (!input || typeof input !== "object") throw new Error("Invalid library input");
    return { name: requireString(input.name, "Library name", 80), description: typeof input.description === "string" ? input.description.slice(0, 240) : "" };
  })
  .handler(async ({ data, context }) => {
    const name = sanitizeText(requireString(data.name, "Library name", 80), 80);
    if (!name) throw new Error("Library name is required");
    const description = sanitizeText(typeof data.description === "string" ? data.description : "", 240);
    const libraryId = id("lib");
    const sql = await getSql();
    await sql.transaction(async (tx) => {
      await tx.query("insert into cinevo_libraries (id, \"ownerId\", name, description) values ($1, $2, $3, $4)", [libraryId, context.userId, name, description]);
      await tx.query("insert into cinevo_library_members (id, \"libraryId\", \"userId\", role) values ($1, $2, $3, 'owner')", [id("member"), libraryId, context.userId]);
    });
    return { id: libraryId };
  });

export const inviteToLibrary = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { libraryId: string; email: string; role: "viewer" | "editor" }) => {
    if (!input || typeof input !== "object") throw new Error("Invalid invite input");
    return { libraryId: requireString(input.libraryId, "Library", 160), email: requireString(input.email, "Email", 254), role: input.role };
  })
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
  .validator((input: { token: string }) => ({ token: requireString(input?.token, "Invite token", 128) }))
  .handler(async ({ data, context }) => {
    const token = requireString(data.token, "Invite token", 128);
    const sql = await getSql();
    const inviteRows = await sql.query<{ libraryId: string; role: string; email: string }>("select \"libraryId\", role, email from cinevo_library_invites where token = $1 and \"expiresAt\" > now() and \"acceptedAt\" is null", [token]);
    const invite = inviteRows[0];
    if (!invite) throw new Error("This invite is expired or already used");
    const { getSessionUser } = await import("./auth/verify.server");
    const user = await getSessionUser();
    if (!user?.email) throw new Error("Could not verify your email. Please sign in again.");
    if (user.email.toLowerCase() !== invite.email.toLowerCase()) throw new Error("This invite is for a different email address");
    return sql.transaction(async (tx) => {
      const claimed = await tx.query<{ libraryId: string; role: string }>("update cinevo_library_invites set \"acceptedAt\" = now() where token = $1 and \"expiresAt\" > now() and \"acceptedAt\" is null returning \"libraryId\", role", [token]);
      const claim = claimed[0];
      if (!claim) throw new Error("This invite is expired or already used");
      await tx.query("insert into cinevo_library_members (id, \"libraryId\", \"userId\", role) values ($1, $2, $3, $4) on conflict (\"libraryId\", \"userId\") do update set role = excluded.role", [id("member"), claim.libraryId, context.userId, claim.role]);
      return { libraryId: claim.libraryId };
    });
  });

export const savePlaybackProgress = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { titleId: string; progress: number; libraryId?: string }) => {
    if (!input || typeof input !== "object") throw new Error("Invalid progress input");
    return { titleId: requireString(input.titleId, "Title", 260), progress: Number(input.progress), libraryId: typeof input.libraryId === "string" ? requireString(input.libraryId, "Library", 160) : "" };
  })
  .handler(async ({ data, context }) => {
    if (typeof data.titleId !== "string" || !/^(plex|jf|jellyfin|node)-[A-Za-z0-9._:-]{1,240}$/.test(data.titleId)) {
      throw new Error("Invalid title");
    }
    if (typeof data.progress !== "number" || !Number.isFinite(data.progress)) {
      throw new Error("Invalid progress");
    }
    if (data.progress < 0 || data.progress > 100) throw new Error("Progress must be between 0 and 100");
    const progress = data.progress;
    const sql = await getSql();
    const titlePrefix = data.titleId.slice(0, data.titleId.indexOf("-"));
    const libraryId: string | null = data.libraryId || null;
    if (titlePrefix !== "node") {
      if (!libraryId) throw new Error("A library is required for provider playback");
      const accessCheck = await sql.query<{ count: number }>(
        `select count(*)::integer as count from cinevo_library_members where "userId" = $1 and "libraryId" = $2`,
        [context.userId, libraryId],
      );
      if (!accessCheck[0]?.count) throw new Error("Unauthorized: no access to that library");
    }
    await sql.query("insert into cinevo_playback_progress (id, \"userId\", \"titleId\", \"libraryId\", progress) values ($1, $2, $3, $4, $5) on conflict (\"userId\", \"titleId\") do update set \"libraryId\" = excluded.\"libraryId\", progress = excluded.progress, \"updatedAt\" = now()", [id("progress"), context.userId, data.titleId, libraryId, progress]);
    return { ok: true };
  });
