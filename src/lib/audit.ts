import type { SupabaseClient } from "@supabase/supabase-js";

export type AuditAction = "INSERT" | "UPDATE" | "DELETE";

/**
 * Writes an entry to the `audit_log` table.
 *
 * Never throws. The audit trail is important but non-critical: a failure here
 * must not break the business mutation that triggered it. Errors are logged
 * to the server console for later inspection.
 *
 * Pattern for UPDATE:
 *   1. SELECT current row -> `before`
 *   2. UPDATE row
 *   3. SELECT updated row (or use returned row) -> `after`
 *   4. logAudit(supabase, 'UPDATE', entity_type, entity_id, before, after)
 */
export async function logAudit(
  supabase: SupabaseClient,
  action: AuditAction,
  entity_type: string,
  entity_id: string,
  before: unknown,
  after: unknown
): Promise<void> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error } = await supabase.from("audit_log").insert({
      user_id: user?.id ?? null,
      action,
      entity_type,
      entity_id,
      before,
      after,
    });
    if (error) {
      console.error("[audit] insert failed", {
        action,
        entity_type,
        entity_id,
        error: error.message,
      });
    }
  } catch (e) {
    console.error("[audit] unexpected error", {
      action,
      entity_type,
      entity_id,
      error: e instanceof Error ? e.message : String(e),
    });
  }
}
