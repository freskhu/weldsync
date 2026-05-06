-- Atomic swap of priority between two planned pieces.
--
-- The previous JS-side swap fired two sequential UPDATEs; if anything
-- crashed between them (network blip, server timeout, db error mid-call)
-- the column was left with two pieces sharing the same priority. That's
-- exactly what we found in production: three pieces stuck at priority=2.
--
-- Wrapping the swap in a PL/pgSQL function gives us a real transaction:
-- both UPDATEs commit together or neither does. Rows are locked in a
-- deterministic order (smallest id first) so two parallel swaps on
-- overlapping pairs can't deadlock.
--
-- Idempotent migration: function is created/replaced on every run.

CREATE OR REPLACE FUNCTION swap_planned_priorities(a_id uuid, b_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  first_id  uuid;
  second_id uuid;
  a_priority int;
  b_priority int;
BEGIN
  -- Deterministic lock order to avoid deadlocks between concurrent swaps.
  IF a_id < b_id THEN
    first_id := a_id; second_id := b_id;
  ELSE
    first_id := b_id; second_id := a_id;
  END IF;

  -- Lock both rows. FOR UPDATE blocks concurrent writers until commit.
  PERFORM 1 FROM piece WHERE id = first_id  FOR UPDATE;
  PERFORM 1 FROM piece WHERE id = second_id FOR UPDATE;

  -- Read current priorities (now stable under our lock).
  SELECT priority INTO a_priority FROM piece WHERE id = a_id;
  SELECT priority INTO b_priority FROM piece WHERE id = b_id;

  IF a_priority IS NULL OR b_priority IS NULL THEN
    RAISE EXCEPTION 'swap_planned_priorities: NULL priority on % or %', a_id, b_id;
  END IF;

  UPDATE piece SET priority = b_priority WHERE id = a_id;
  UPDATE piece SET priority = a_priority WHERE id = b_id;
END;
$$;

-- Allow authenticated users to call the function. RLS on the underlying
-- table still applies to the UPDATEs inside.
GRANT EXECUTE ON FUNCTION swap_planned_priorities(uuid, uuid) TO authenticated;
