/**
 * Planning window data accessors.
 *
 * The planning window defines the horizon for the Gantt and calendar views.
 * Only one row has is_active = true at a time (enforced by partial unique
 * index in the DB). The UI always reads that single active row.
 */

import type { PlanningWindow } from "@/lib/types";
import { createServerSupabaseClient } from "@/lib/supabase-server";

/**
 * Returns the currently active planning window, or null if none exists.
 *
 * Resilient to two failure modes that must NOT break the UI:
 *  1. Table doesn't exist yet (migration 00005 not applied) → PostgREST code
 *     "PGRST205" (schema cache miss) or Postgres "42P01" (undefined_table).
 *  2. Table exists but has no active row → maybeSingle() returns null cleanly.
 *
 * In both cases we return null so the page renders the "no active window"
 * banner instead of crashing the Server Component with a 500.
 */
export async function getActivePlanningWindow(): Promise<PlanningWindow | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("planning_window")
    .select("*")
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    // Treat "table missing" as "no active window" so the app keeps working
    // before the migration is applied. Any other error is still surfaced.
    if (error.code === "PGRST205" || error.code === "42P01") {
      return null;
    }
    // Log so the cause stays visible in Vercel logs, but don't throw:
    // a planning window is non-critical for page rendering.
    console.error("[getActivePlanningWindow] unexpected error", error);
    return null;
  }
  return data;
}

/**
 * Updates the currently active planning window.
 * Returns the updated row, or null if no active window exists.
 */
export async function updateActivePlanningWindow(
  input: {
    start_date: string;
    end_date: string;
    label?: string | null;
  }
): Promise<PlanningWindow | null> {
  const supabase = await createServerSupabaseClient();

  // Find the active window id first (we don't trust a client-supplied id)
  const active = await getActivePlanningWindow();
  if (!active) return null;

  const patch: Record<string, unknown> = {
    start_date: input.start_date,
    end_date: input.end_date,
    updated_at: new Date().toISOString(),
  };
  if (input.label !== undefined) patch.label = input.label;

  const { data, error } = await supabase
    .from("planning_window")
    .update(patch)
    .eq("id", active.id)
    .select()
    .single();

  if (error) {
    // Row not found → signal "no active window" to the caller.
    if (error.code === "PGRST116") return null;
    // Table missing → same treatment; the UI will keep showing the banner.
    if (error.code === "PGRST205" || error.code === "42P01") return null;
    throw new Error(`updateActivePlanningWindow: ${error.message}`);
  }
  return data;
}
