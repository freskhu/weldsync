-- Backfill priority for planned pieces missing it.
-- Visual order: urgent first, then scheduled_date asc nulls last, then created_at asc.
-- Idempotent: only NULLs are touched.

WITH max_existing AS (
  SELECT COALESCE(MAX(priority), 0) AS m FROM piece WHERE status = 'planned'
),
ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      ORDER BY
        urgent DESC,
        scheduled_date ASC NULLS LAST,
        created_at ASC
    ) AS rn
  FROM piece
  WHERE status = 'planned' AND priority IS NULL
)
UPDATE piece
SET priority = (SELECT m FROM max_existing) + ranked.rn
FROM ranked
WHERE piece.id = ranked.id;
