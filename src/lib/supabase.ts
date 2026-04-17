import { createBrowserClient } from "@supabase/ssr";

/**
 * Creates a Supabase client for use in Client Components (browser).
 * Uses the public anon key — RLS enforces authorization.
 */
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn(
      "Supabase env vars not set. Running in offline mode — database operations will fail."
    );
    // Return a dummy client that won't crash the app on import
    // but will fail gracefully on actual DB calls
    return createBrowserClient(
      "https://placeholder.supabase.co",
      "placeholder-key"
    );
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
