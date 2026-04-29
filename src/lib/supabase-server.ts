/**
 * @deprecated Import from `@/lib/supabase/server` instead.
 *
 * Thin re-export kept for backwards compatibility. Will be removed once all
 * call sites are migrated. The new helper is named `createClient`; the legacy
 * `createServerSupabaseClient` alias is preserved here to catch stragglers.
 */
export { createClient as createServerSupabaseClient } from "@/lib/supabase/server";
