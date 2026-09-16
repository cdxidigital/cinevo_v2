import { createServerFn } from "@tanstack/react-start";
import { getSql } from "./db";
import { requireUserId } from "./auth/verify.server";

export const loadAccountState = createServerFn({ method: "GET" }).handler(async () => {
  const userId = await requireUserId();
  const sql = await getSql();
  const rows = await sql.query<{ state: unknown }>(
    'select state from cinevo_user_state where "userId" = $1 limit 1',
    [userId],
  );
  return rows[0]?.state ?? null;
});

export const saveAccountState = createServerFn({ method: "POST" })
  .validator((input: { state: Record<string, unknown> }) => input)
  .handler(async ({ data }) => {
    const userId = await requireUserId();
    const sql = await getSql();
    const id = `cinevo-${userId}`;
    await sql.query(
      `insert into cinevo_user_state (id, "userId", state, "updatedAt")
       values ($1, $2, $3::jsonb, now())
       on conflict ("userId") do update set state = excluded.state, "updatedAt" = now()`,
      [id, userId, JSON.stringify(data.state)],
    );
    return { ok: true as const };
  });
