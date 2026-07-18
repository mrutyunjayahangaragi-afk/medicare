import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";
import { getRoleDashboardPath, normalizeRole } from "@/lib/auth/get-user-role";

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

  const isProtected  = protectedRoutes.some((r) => pathname.startsWith(r));
  const isAdminRoute = adminRoutes.some(
    (r) => pathname.startsWith(r) && !pathname.startsWith(adminLoginRoute)
  );
  const isPublicOnly = publicOnlyRoutes.some((r) => pathname.startsWith(r));

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
  // Look up their actual role so they land on the correct portal directly,
  // without an intermediate /dashboard → /admin double-redirect.
  if (isPublicOnly && user) {
    try {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        // Profile query failed (RLS, network, schema) — do NOT silently
        // route to /dashboard. Redirect to login with a clear error code
        // so the user is informed and can retry.
        console.error("[middleware] Profile role query failed", {
          userId: user.id,
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        });
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = "/login";
        redirectUrl.searchParams.set("error", "role_lookup_failed");
        return NextResponse.redirect(redirectUrl);
      }

      if (!profile?.role) {
        // Profile row missing or role column is null — cannot determine
        // the correct portal; send back to login with an error.
        console.warn("[middleware] No profile/role found for authenticated user", {
          userId: user.id,
        });
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = "/login";
        redirectUrl.searchParams.set("error", "no_profile");
        return NextResponse.redirect(redirectUrl);
      }

      const role = normalizeRole(profile.role as string);
      const destination = getRoleDashboardPath(role);

      console.info("[middleware] Resolved access", {
        userId: user.id,
        databaseRole: profile.role,
        normalizedRole: role,
        destination,
      });

      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = destination;
      return NextResponse.redirect(redirectUrl);
    } catch (err) {
      console.error("[middleware] Unexpected error resolving role:", err);
      // On unexpected error, redirect to login rather than /dashboard
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/login";
      redirectUrl.searchParams.set("error", "role_lookup_failed");
      return NextResponse.redirect(redirectUrl);
    }
  }

  return supabaseResponse;
}
