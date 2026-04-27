-- Add 'planned' value to piece_status enum.
-- Inserted before 'programmed' to keep workflow ordering:
-- backlog -> planned -> programmed -> allocated -> in_production -> completed
-- Idempotent via DO block (Postgres doesn't support IF NOT EXISTS in ALTER TYPE
-- ADD VALUE on all versions; the duplicate_object exception path is the safe form).

DO $$
BEGIN
  ALTER TYPE piece_status ADD VALUE 'planned' BEFORE 'programmed';
EXCEPTION
  WHEN duplicate_object THEN
    -- Value already exists; safe to ignore on re-run.
    NULL;
END
$$;
