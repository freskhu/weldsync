-- Half-day granularity for piece planned range
-- Migration: 00009_piece_half_day
--
-- Adds half-day period columns to `piece` so planning can distinguish between
-- morning (08:00-12:00) and afternoon (13:00-17:00) starts and ends.
--
--   piece.planned_start_period  (morning | afternoon)
--   piece.planned_end_period    (morning | afternoon)
--
-- Rules:
--   - Both planned dates + both planned periods must be set together (or all null).
--   - The pair (planned_end_date, planned_end_period) must be >=
--     (planned_start_date, planned_start_period) when compared as half-day ordinals.
--   - Two pieces on the same robot cannot overlap at half-day resolution.
--
-- The existing `schedule_period` enum uses AM/PM and is bound to `scheduled_period`
-- (a separate column driving cell allocation). We introduce a new enum
-- `piece_period` with `morning`/`afternoon` for the planned range — keeping
-- the two concepts decoupled instead of overloading `schedule_period`.
--
-- Idempotent: safe to re-run. Existing planned pieces are backfilled to
-- morning->afternoon (= full day) so the new NOT NULL-when-paired constraint
-- does not break historical data.

-- ---------------------------------------------------------------------------
-- 1. Enum
-- ---------------------------------------------------------------------------

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'piece_period') THEN
        CREATE TYPE piece_period AS ENUM ('morning', 'afternoon');
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2. Helper function: map (date, period) -> timestamp at slot boundary
-- ---------------------------------------------------------------------------
-- Used by the exclusion constraint (which needs IMMUTABLE expressions) and
-- available for queries that need half-day resolution timestamps.
--
--   is_end = false -> slot start  (morning = 08:00, afternoon = 13:00)
--   is_end = true  -> slot end    (morning = 12:00, afternoon = 17:00)
--
-- Returns NULL if any input is NULL (propagates cleanly into tsrange).

CREATE OR REPLACE FUNCTION piece_slot_ts(
    d    DATE,
    p    piece_period,
    is_end BOOLEAN
) RETURNS TIMESTAMP
LANGUAGE SQL
IMMUTABLE
AS $$
    SELECT CASE
        WHEN d IS NULL OR p IS NULL THEN NULL
        WHEN NOT is_end AND p = 'morning'   THEN (d + INTERVAL '8 hours')::timestamp
        WHEN NOT is_end AND p = 'afternoon' THEN (d + INTERVAL '13 hours')::timestamp
        WHEN     is_end AND p = 'morning'   THEN (d + INTERVAL '12 hours')::timestamp
        WHEN     is_end AND p = 'afternoon' THEN (d + INTERVAL '17 hours')::timestamp
    END
$$;

-- ---------------------------------------------------------------------------
-- 3. Columns
-- ---------------------------------------------------------------------------

ALTER TABLE piece
    ADD COLUMN IF NOT EXISTS planned_start_period piece_period,
    ADD COLUMN IF NOT EXISTS planned_end_period   piece_period;

-- ---------------------------------------------------------------------------
-- 4. Backfill existing planned pieces -> full day (morning -> afternoon)
-- ---------------------------------------------------------------------------
-- Must happen BEFORE the coherence CHECK constraint is added, otherwise
-- historical rows with planned dates but no periods would violate it.

UPDATE piece
SET    planned_start_period = 'morning',
       planned_end_period   = 'afternoon'
WHERE  planned_start_date IS NOT NULL
  AND  planned_end_date   IS NOT NULL
  AND  (planned_start_period IS NULL OR planned_end_period IS NULL);

-- ---------------------------------------------------------------------------
-- 5. CHECK constraints
-- ---------------------------------------------------------------------------

DO $$
BEGIN
    -- Start date <-> start period: both or neither.
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'piece_planned_start_date_period_both_or_neither'
    ) THEN
        ALTER TABLE piece
            ADD CONSTRAINT piece_planned_start_date_period_both_or_neither
            CHECK (
                (planned_start_date IS NULL AND planned_start_period IS NULL)
                OR (planned_start_date IS NOT NULL AND planned_start_period IS NOT NULL)
            );
    END IF;

    -- End date <-> end period: both or neither.
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'piece_planned_end_date_period_both_or_neither'
    ) THEN
        ALTER TABLE piece
            ADD CONSTRAINT piece_planned_end_date_period_both_or_neither
            CHECK (
                (planned_end_date IS NULL AND planned_end_period IS NULL)
                OR (planned_end_date IS NOT NULL AND planned_end_period IS NOT NULL)
            );
    END IF;

    -- Temporal ordering at half-day resolution:
    -- end slot-start must be >= start slot-start.
    -- Uses the IMMUTABLE helper so the check is deterministic.
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'piece_planned_range_half_day_order'
    ) THEN
        ALTER TABLE piece
            ADD CONSTRAINT piece_planned_range_half_day_order
            CHECK (
                planned_start_date  IS NULL
                OR planned_end_date   IS NULL
                OR planned_start_period IS NULL
                OR planned_end_period   IS NULL
                OR piece_slot_ts(planned_end_date,   planned_end_period,   false)
                   >= piece_slot_ts(planned_start_date, planned_start_period, false)
            );
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 6. Rewrite the overlap exclusion constraint at half-day resolution
-- ---------------------------------------------------------------------------
-- Strategy: drop the old daterange-based constraint and replace with a tsrange
-- that uses the slot boundaries. Half-open `[)` so two pieces whose start and
-- end slots only touch (e.g. one ends 12:00, the next starts 13:00) do not
-- collide.
--
-- The WHERE clause guards the constraint so backlog pieces (no robot, no dates)
-- are excluded. All four period/date columns must be NOT NULL for the
-- constraint to apply.

CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE piece DROP CONSTRAINT IF EXISTS piece_no_robot_overlap;

-- Safety check: abort the migration if any current planned rows would overlap
-- under the new half-day rule. This should not happen because the previous
-- daterange [] constraint was stricter (treated same-day touches as overlap),
-- but we assert explicitly before creating the constraint.
DO $$
DECLARE
    overlap_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO overlap_count
    FROM (
        SELECT p1.id
        FROM piece p1
        JOIN piece p2 ON p1.robot_id = p2.robot_id AND p1.id < p2.id
        WHERE p1.robot_id IS NOT NULL
          AND p1.planned_start_date IS NOT NULL AND p1.planned_end_date IS NOT NULL
          AND p1.planned_start_period IS NOT NULL AND p1.planned_end_period IS NOT NULL
          AND p2.planned_start_date IS NOT NULL AND p2.planned_end_date IS NOT NULL
          AND p2.planned_start_period IS NOT NULL AND p2.planned_end_period IS NOT NULL
          AND tsrange(
                piece_slot_ts(p1.planned_start_date, p1.planned_start_period, false),
                piece_slot_ts(p1.planned_end_date,   p1.planned_end_period,   true),
                '[)'
              )
              &&
              tsrange(
                piece_slot_ts(p2.planned_start_date, p2.planned_start_period, false),
                piece_slot_ts(p2.planned_end_date,   p2.planned_end_period,   true),
                '[)'
              )
    ) s;

    IF overlap_count > 0 THEN
        RAISE EXCEPTION
            'Cannot add piece_no_robot_overlap: % pre-existing overlapping pairs at half-day resolution',
            overlap_count;
    END IF;
END $$;

ALTER TABLE piece
    ADD CONSTRAINT piece_no_robot_overlap
    EXCLUDE USING gist (
        robot_id WITH =,
        tsrange(
            piece_slot_ts(planned_start_date, planned_start_period, false),
            piece_slot_ts(planned_end_date,   planned_end_period,   true),
            '[)'
        ) WITH &&
    )
    WHERE (
        robot_id IS NOT NULL
        AND planned_start_date IS NOT NULL
        AND planned_end_date   IS NOT NULL
        AND planned_start_period IS NOT NULL
        AND planned_end_period   IS NOT NULL
    );
