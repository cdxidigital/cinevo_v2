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

export const createSharedLibrary = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { name: string; description?: string }) => input)
  .handler(async ({ data, context }) => {
    const name = data.name.trim().slice(0, 80);
    if (!name) throw new Error("Library name is required");
    const libraryId = id("lib");
    const sql = await getSql();
    await sql.query("insert into cinevo_libraries (id, \"ownerId\", name, description) values ($1, $2, $3, $4)", [libraryId, context.userId, name, (data.description || "").trim().slice(0, 240)]);
    await sql.query("insert into cinevo_library_members (id, \"libraryId\", \"userId\", role) values ($1, $2, $3, 'owner')", [id("member"), libraryId, context.userId]);
    return { id: libraryId };
  });

export const inviteToLibrary = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { libraryId: string; email: string; role: "viewer" | "editor" }) => input)
  .handler(async ({ data, context }) => {
    const email = data.email.trim().toLowerCase();
    if (!email.includes("@")) throw new Error("Enter a valid email");
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
    const rows = await sql.query<{ libraryId: string; role: string }>("select \"libraryId\", role from cinevo_library_invites where token = $1 and \"expiresAt\" > now() and \"acceptedAt\" is null", [data.token]);
    const invite = rows[0];
    if (!invite) throw new Error("This invite is expired or already used");
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
    await sql.query("insert into cinevo_playback_progress (id, \"userId\", \"titleId\", progress) values ($1, $2, $3, $4) on conflict (\"userId\", \"titleId\") do update set progress = excluded.progress, \"updatedAt\" = now()", [id("progress"), context.userId, data.titleId, progress]);
    return { ok: true };
  });
