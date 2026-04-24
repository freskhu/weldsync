-- Planning window: disable RLS to match the rest of the project
-- Migration: 00006_planning_window_rls
--
-- Context: 00005 created planning_window but Supabase enabled RLS by default
-- (possibly via project-level setting). All other tables (robot, project,
-- piece, program) have RLS disabled for the MVP (no auth layer yet), so
-- planning_window was the odd one out: RLS on, no policies => anon reads
-- zero rows, even though the row exists. That caused the "Sem janela de
-- planeamento activa" banner to persist in production.
--
-- Fix: disable RLS on planning_window to match the rest of the schema.
-- When auth is introduced, RLS will be re-enabled across ALL tables with
-- consistent policies, not table-by-table.

ALTER TABLE IF EXISTS planning_window DISABLE ROW LEVEL SECURITY;
