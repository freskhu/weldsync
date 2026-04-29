-- Fragment B2: enable RLS on all domain tables and grant authenticated users
-- full read/write access. App-level authorization (roles, scopes) is layered
-- on top later — for now any authenticated Curval user can do anything, and
-- anon traffic is rejected at the database.
--
-- Idempotent: safe to re-run. Drops and recreates the policy each time.
--
-- Sequencing reminder: this migration MUST be applied AFTER the auth code
-- (middleware + /login + /auth/callback) is deployed. Applying earlier locks
-- out anon traffic before the app can authenticate.

DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY['robot', 'project', 'piece', 'program', 'planning_window', 'audit_log']
    LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('DROP POLICY IF EXISTS authenticated_all ON %I', t);
        EXECUTE format(
            'CREATE POLICY authenticated_all ON %I FOR ALL TO authenticated USING (true) WITH CHECK (true)',
            t
        );
    END LOOP;
END $$;
