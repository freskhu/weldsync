-- Add 'manual_weld' value to piece_status enum.
-- Pieces in this status were welded by hand on the shop floor instead of being
-- programmed on a robot. They are kept in the database for historical tracking
-- but exit the automated planning flow.
--
-- Inserted before 'allocated' to preserve the conceptual ordering:
--   backlog -> planned -> programmed -> manual_weld (terminal-ish branch)
--                                    -> allocated -> in_production -> completed
-- The exact placement is cosmetic (we only iterate the enum in app code).
--
-- IMPORTANT: ALTER TYPE ... ADD VALUE cannot run inside a transaction block in
-- older Postgres versions. Supabase migration runner wraps statements in a
-- transaction by default, so this migration must be applied standalone (or via
-- a runner that detects the ADD VALUE clause and disables tx wrapping).
-- The DO block + duplicate_object catch keeps it idempotent on re-run.

DO $$
BEGIN
  ALTER TYPE piece_status ADD VALUE 'manual_weld' BEFORE 'allocated';
EXCEPTION
  WHEN duplicate_object THEN
    -- Value already exists; safe to ignore on re-run.
    NULL;
END
$$;
