CREATE TABLE IF NOT EXISTS cinevo_libraries (
  id text PRIMARY KEY,
  "ownerId" text NOT NULL,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cinevo_library_members (
  id text PRIMARY KEY,
  "libraryId" text NOT NULL,
  "userId" text NOT NULL,
  role text NOT NULL DEFAULT 'viewer',
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("libraryId", "userId")
);

CREATE TABLE IF NOT EXISTS cinevo_library_invites (
  id text PRIMARY KEY,
  "libraryId" text NOT NULL,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'viewer',
  token text NOT NULL UNIQUE,
  "expiresAt" timestamptz NOT NULL,
  "acceptedAt" timestamptz,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cinevo_library_members_user_idx ON cinevo_library_members ("userId");
CREATE INDEX IF NOT EXISTS cinevo_library_invites_token_idx ON cinevo_library_invites (token);

CREATE TABLE IF NOT EXISTS cinevo_proxy_sources (
  id text PRIMARY KEY,
  "ownerId" text NOT NULL,
  provider text NOT NULL,
  name text NOT NULL,
  "baseUrl" text NOT NULL,
  "accessToken" text NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cinevo_proxy_sources_owner_idx ON cinevo_proxy_sources ("ownerId");

CREATE TABLE IF NOT EXISTS cinevo_playback_progress (
  id text PRIMARY KEY,
  "userId" text NOT NULL,
  "titleId" text NOT NULL,
  progress numeric NOT NULL DEFAULT 0,
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("userId", "titleId")
);

CREATE INDEX IF NOT EXISTS cinevo_playback_progress_user_idx ON cinevo_playback_progress ("userId");
