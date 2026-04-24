-- Date ranges for projects and pieces
-- Migration: 00007_add_date_ranges
--
-- Adds per-entity planning dates:
--   project.start_date / project.end_date  (project window — separate from deadline)
--   piece.planned_start_date / piece.planned_end_date  (piece planned range)
--
-- All columns are nullable. piece.scheduled_date is preserved untouched:
-- it still drives AM/PM cell allocation on the Gantt. The new range columns
-- drive the "span block" rendering on calendar/Gantt — a piece only shows
-- as a spanning block when BOTH planned dates are set.
--
-- Idempotent: safe to re-run. Uses IF NOT EXISTS on columns and
-- DO blocks for constraints so a partial prior run does not break.

-- ---------------------------------------------------------------------------
-- project: start_date + end_date
-- ---------------------------------------------------------------------------

ALTER TABLE project
    ADD COLUMN IF NOT EXISTS start_date DATE,
    ADD COLUMN IF NOT EXISTS end_date   DATE;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'project_end_after_start'
    ) THEN
        ALTER TABLE project
            ADD CONSTRAINT project_end_after_start
            CHECK (
                start_date IS NULL
                OR end_date  IS NULL
                OR end_date >= start_date
            );
    END IF;

    -- "Both or neither" — if one is set, the other must be too.
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'project_dates_both_or_neither'
    ) THEN
        ALTER TABLE project
            ADD CONSTRAINT project_dates_both_or_neither
            CHECK (
                (start_date IS NULL AND end_date IS NULL)
                OR (start_date IS NOT NULL AND end_date IS NOT NULL)
            );
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- piece: planned_start_date + planned_end_date
-- ---------------------------------------------------------------------------

ALTER TABLE piece
    ADD COLUMN IF NOT EXISTS planned_start_date DATE,
    ADD COLUMN IF NOT EXISTS planned_end_date   DATE;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'piece_planned_end_after_start'
    ) THEN
        ALTER TABLE piece
            ADD CONSTRAINT piece_planned_end_after_start
            CHECK (
                planned_start_date IS NULL
                OR planned_end_date  IS NULL
                OR planned_end_date >= planned_start_date
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'piece_planned_dates_both_or_neither'
    ) THEN
        ALTER TABLE piece
            ADD CONSTRAINT piece_planned_dates_both_or_neither
            CHECK (
                (planned_start_date IS NULL AND planned_end_date IS NULL)
                OR (planned_start_date IS NOT NULL AND planned_end_date IS NOT NULL)
            );
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Indexes — cover the typical "pieces visible in a date window" query
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_piece_planned_range
    ON piece (planned_start_date, planned_end_date)
    WHERE planned_start_date IS NOT NULL AND planned_end_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_piece_robot_planned_range
    ON piece (robot_id, planned_start_date, planned_end_date)
    WHERE planned_start_date IS NOT NULL AND planned_end_date IS NOT NULL;
