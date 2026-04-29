-- Piece priority + last status change audit
-- Idempotent: safe to re-run.
--
-- Adds:
--   1. priority INTEGER (nullable) — ordering within the "programmed" kanban
--      column. Assigned automatically at the application layer when a piece
--      enters the "programmed" status (next-in-line via MAX+1). Cleared when
--      the piece leaves "programmed".
--   2. last_status_change_by / last_status_change_at — who moved the piece
--      and when. Populated by server actions that mutate `status`.

ALTER TABLE piece
    ADD COLUMN IF NOT EXISTS priority INTEGER,
    ADD COLUMN IF NOT EXISTS last_status_change_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS last_status_change_at TIMESTAMPTZ;

-- Partial index: only "programmed" pieces have a priority. Used by the
-- kanban query that orders the Programada column by priority ASC NULLS LAST.
CREATE INDEX IF NOT EXISTS idx_piece_status_priority
    ON piece (status, priority)
    WHERE priority IS NOT NULL;

-- Display-name helper for the audit footer ("X mudou em DD/MM").
-- auth.users is not exposed to the authenticated role, so we go through a
-- SECURITY DEFINER function. Resolves to: full_name (raw_user_meta_data) ->
-- name (raw_user_meta_data) -> email-prefix-before-@ -> NULL.
CREATE OR REPLACE FUNCTION public.get_user_display_names(ids UUID[])
RETURNS TABLE (id UUID, display_name TEXT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT
        u.id,
        COALESCE(
            NULLIF(u.raw_user_meta_data->>'full_name', ''),
            NULLIF(u.raw_user_meta_data->>'name', ''),
            split_part(u.email, '@', 1)
        ) AS display_name
    FROM auth.users u
    WHERE u.id = ANY(ids);
$$;

REVOKE ALL ON FUNCTION public.get_user_display_names(UUID[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_display_names(UUID[]) TO authenticated;
