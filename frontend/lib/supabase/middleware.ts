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
    let destination = "/dashboard"; // safe default if role lookup fails

    try {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        // Log on the server; do not silently fall back to /dashboard for
        // a broken query — let the layout guard handle it properly.
        console.error(
          `[middleware] Profile role query failed for userId=${user.id}: ${error.message}`
        );
      } else if (profile?.role) {
        const role = normalizeRole(profile.role as string);
        destination = getRoleDashboardPath(role);

        console.info("[middleware] Resolved access", {
          userId: user.id,
          databaseRole: role,
          destination,
        });
      }
    } catch (err) {
      console.error("[middleware] Unexpected error resolving role:", err);
    }

    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = destination;
    return NextResponse.redirect(redirectUrl);
  }

  return supabaseResponse;
}
