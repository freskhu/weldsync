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
 * Returns the currently active planning window, or null if none exists
 * (e.g. the seed has not yet been applied).
 */
export async function getActivePlanningWindow(): Promise<PlanningWindow | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("planning_window")
    .select("*")
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw new Error(`getActivePlanningWindow: ${error.message}`);
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
    if (error.code === "PGRST116") return null;
    throw new Error(`updateActivePlanningWindow: ${error.message}`);
  }
  return data;
}
