-- Renumber priority for ALL planned pieces to a clean 1..N sequence.
--
-- Background: an earlier (NULL-only) backfill left duplicate priorities and
-- gaps in production (e.g. three pieces with priority=2; gaps at 7, 10, 12).
-- That broke getPlannedNeighbour, which assumes the immediate neighbour by
-- priority is exactly one slot away — duplicates returned ambiguous results
-- and gaps caused swaps to jump multiple visual slots.
--
-- This migration walks every planned piece in the kanban's visual order and
-- assigns sequential priorities 1..N. It's idempotent: running it again on a
-- clean column yields the same numbers (every row already matches its rank).
--
-- Visual order: existing priority asc (nulls last) → urgent first →
-- scheduled_date asc nulls last → created_at asc. Mirrors KanbanBoard.
-- The "priority asc nulls last" key preserves any manual ordering the
-- planner has already done, then folds in NULL pieces at the bottom.

WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      ORDER BY
        priority ASC NULLS LAST,
        urgent DESC,
        scheduled_date ASC NULLS LAST,
        created_at ASC
    ) AS rn
  FROM piece
  WHERE status = 'planned'
)
UPDATE piece
SET priority = ranked.rn
FROM ranked
WHERE piece.id = ranked.id
  AND piece.priority IS DISTINCT FROM ranked.rn;
