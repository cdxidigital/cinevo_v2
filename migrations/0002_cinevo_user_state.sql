CREATE TABLE IF NOT EXISTS cinevo_user_state (
  id text PRIMARY KEY,
  "userId" text NOT NULL,
  state jsonb NOT NULL DEFAULT '{}'::jsonb,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS cinevo_user_state_user_id_idx ON cinevo_user_state ("userId");
