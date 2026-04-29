import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Supabase client for Server Components, Server Actions, and Route Handlers.
 *
 * Cookie-based session management via @supabase/ssr. Must be called inside a
 * server execution context — not at module level — because it awaits `cookies()`
 * from `next/headers`.
 *
 * `setAll` is wrapped in try/catch: writing cookies fails inside Server
 * Components (read-only context). Server Actions and Route Handlers can write,
 * which is where session refresh actually needs to land.
 *
 * Usage:
 *   import { createClient } from '@/lib/supabase/server';
 *   const supabase = await createClient();
 */
export async function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const cookieStore = await cookies();

  const url = supabaseUrl ?? "https://placeholder.supabase.co";
  const key = supabaseAnonKey ?? "placeholder-key";

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn(
      "Supabase env vars not set. Running in offline mode — database operations will fail."
    );
  }

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // setAll fails in Server Components (read-only cookies).
          // Expected — mutations happen in Server Actions / Route Handlers.
        }
      },
    },
  });
}
