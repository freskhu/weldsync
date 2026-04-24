-- Prevent piece overlap on the same robot
-- Migration: 00008_no_overlap_exclusion
--
-- Adds a GiST exclusion constraint on `piece` so that two pieces assigned
-- to the same robot cannot have overlapping planned date ranges.
--
-- The constraint only applies when robot_id, planned_start_date and
-- planned_end_date are all NOT NULL (pieces in backlog with no robot /
-- no dates are ignored).
--
-- Range semantics: inclusive-inclusive `[]` — a piece ending on day D
-- and another starting on the same day D are considered overlapping.
-- This matches how the Gantt renders spans (end-day-inclusive).
--
-- Idempotent: safe to re-run. Uses IF NOT EXISTS on the extension and
-- a DO block guarded by pg_constraint lookup for the constraint itself.
--
-- Raises SQLSTATE 23P01 (exclusion_violation) on conflicting writes —
-- callers must map this to a user-facing message.

CREATE EXTENSION IF NOT EXISTS btree_gist;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'piece_no_robot_overlap'
    ) THEN
        ALTER TABLE piece
            ADD CONSTRAINT piece_no_robot_overlap
            EXCLUDE USING gist (
                robot_id WITH =,
                daterange(planned_start_date, planned_end_date, '[]') WITH &&
            )
            WHERE (
                robot_id IS NOT NULL
                AND planned_start_date IS NOT NULL
                AND planned_end_date IS NOT NULL
            );
    END IF;
END $$;
