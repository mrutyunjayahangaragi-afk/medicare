import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return supabaseResponse;
  }

  const supabase = createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // Always use getUser() — never getSession() — for secure server-side auth checks.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  const protectedRoutes = [
    "/account",
    "/dashboard",
    "/profile",
    "/coming-soon",
    "/hospital",
    "/responder",
    "/application-pending",
    "/unauthorized",
  ];
  const adminRoutes    = ["/admin"];
  const publicOnlyRoutes = ["/login", "/register"];
  // /admin/login is handled separately — let the component deal with it
  const adminLoginRoute = "/admin/login";
  // Profile error page must be public to avoid redirect loops
  const profileErrorRoute = "/auth/profile-error";

  const isProtected  = protectedRoutes.some((r) => pathname.startsWith(r));
  const isAdminRoute = adminRoutes.some(
    (r) => pathname.startsWith(r) && !pathname.startsWith(adminLoginRoute)
  );
  const isPublicOnly = publicOnlyRoutes.some((r) => pathname.startsWith(r));
  const isProfileError = pathname.startsWith(profileErrorRoute);

  // ── Unauthenticated: redirect to login ────────────────────────────
  if (isAdminRoute && !user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = adminLoginRoute;
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (isProtected && !user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // ── Authenticated user hitting /login or /register ─────────────────
  // DO NOT redirect authenticated users away from /login.
  // Let the login page handle role resolution and show errors if needed.
  // This prevents the infinite redirect loop when role lookup fails.
  if (isPublicOnly && user) {
    // Allow authenticated users to stay on /login to see error messages
    // or re-authenticate. The login page will handle redirecting them
    // after successful role resolution.
    return supabaseResponse;
  }

  // ── Profile error page must be accessible to authenticated users ───────
  // This page handles role lookup failures and must not redirect back to dashboard
  if (isProfileError) {
    return supabaseResponse;
  }

  return supabaseResponse;
}
