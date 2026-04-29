import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the Supabase auth session in Next.js middleware.
 *
 * Wired into `middleware.ts` at repo root once Fragment B2 lands. Until then
 * this helper is unused — kept here so the auth pipeline is ready to plug in
 * (RLS, /login, route guards) without further refactor.
 *
 * Pattern follows the official Supabase + Next.js App Router guide:
 *   - Read incoming cookies from `request`
 *   - Forward them onto the response so downstream Server Components see the
 *     refreshed session
 *   - Call `supabase.auth.getUser()` to trigger session refresh side-effect
 *
 * Do NOT add logic between `createServerClient` and `getUser()`. Anything that
 * runs in between can desync cookies and silently log users out.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // Triggers session refresh. Must run immediately after createServerClient.
  await supabase.auth.getUser();

  return response;
}
