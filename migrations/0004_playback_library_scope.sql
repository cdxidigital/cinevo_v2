ALTER TABLE cinevo_playback_progress ADD COLUMN IF NOT EXISTS "libraryId" text;
CREATE INDEX IF NOT EXISTS cinevo_playback_progress_library_idx ON cinevo_playback_progress ("libraryId");
