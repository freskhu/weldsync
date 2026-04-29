import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Auth middleware.
 *
 * On every request:
 *   1. Refresh the Supabase session cookie via `@supabase/ssr`.
 *   2. If the route is protected and there is no user, redirect to /login.
 *
 * Public routes (no auth required):
 *   - /login
 *   - /auth/* (callback, signout)
 *   - /_next/* (Next.js internals — already excluded by matcher, but listed for clarity)
 *   - Static asset extensions (svg, png, jpg, jpeg, gif, webp, ico, woff, woff2, ttf)
 *
 * Everything else is protected.
 *
 * NOTE: do NOT add logic between `createServerClient` and `getUser()` —
 * anything in between can desync cookies and silently log users out.
 */

const PUBLIC_PATH_PREFIXES = ["/login", "/auth/"];
const STATIC_ASSET_REGEX = /\.(svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf)$/i;

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATH_PREFIXES.some((p) => pathname === p || pathname.startsWith(p))) {
    return true;
  }
  if (STATIC_ASSET_REGEX.test(pathname)) {
    return true;
  }
  return false;
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If env not configured, skip auth (dev fallback). Prod has these set.
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

  // Refresh session. Must run immediately after createServerClient.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return response;
  }

  if (!user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     *   - _next/static (build output)
     *   - _next/image (image optimization)
     *   - favicon.ico
     *
     * Static asset extensions are filtered inside the middleware itself so
     * the public/protected logic stays in one place.
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
