import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { type LoginPortal, type RegistrationType, type ApplicationType } from "@/types/auth";

/**
 * Google OAuth + PKCE callback handler.
 * After Google authenticates the user, Supabase redirects here with ?code=...
 * We exchange the code for a session, ensure a profile row exists,
 * resolve the trusted role, compare with requested portal, and redirect accordingly.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const requestedPortal = searchParams.get("portal") as LoginPortal | null;
  const registrationType = searchParams.get("type") as RegistrationType | null;

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=oauth_failed`);
  }

  const supabase = await createClient();
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    console.error("[auth/callback] Code exchange failed:", exchangeError.code);
    return NextResponse.redirect(`${origin}/login?error=oauth_failed`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${origin}/login?error=oauth_failed`);
  }

  // Ensure a profile row exists for this user.
  // For Google users this may be the first sign-in — upsert is safe.
  // Use maybeSingle() so a missing row returns null data without a PGRST116 error.
  const { data: existing, error: existingError } = await supabase
    .from("profiles")
    .select("id, role, is_verified")
    .eq("id", user.id)
    .maybeSingle();

  if (existingError) {
    console.error("[auth/callback] Profile fetch failed:", existingError.message, existingError.code);
    return NextResponse.redirect(`${origin}/login?error=oauth_failed`);
  }

  if (!existing) {
    const meta = user.user_metadata ?? {};
    const defaultRole = "user" as const;

    // Use insert instead of upsert to avoid overwriting existing admin roles
    // If profile exists, we'll use the centralized role resolver below
    const { error: insertError } = await supabase.from("profiles").insert({
      id: user.id,
      full_name: (meta.full_name as string | null) ?? (meta.name as string | null) ?? null,
      email: user.email ?? null,
      phone: null,
      role: defaultRole,
      hospital_name: null,
      avatar_url: (meta.avatar_url as string | null) ?? (meta.picture as string | null) ?? null,
      is_verified: true,
      updated_at: new Date().toISOString(),
    });

    // If insert fails due to duplicate (profile already exists), that's fine
    // We'll use the existing profile's role in the centralized resolver
    if (insertError && insertError.code !== "23505") {
      console.error("[auth/callback] Profile insert failed:", insertError.message, insertError.code);
      return NextResponse.redirect(`${origin}/login?error=oauth_failed`);
    }

    // Handle registration flow - create application if needed
    if (registrationType && (registrationType === "hospital" || registrationType === "responder")) {
      await createApplication(supabase, user.id, registrationType as ApplicationType);
      return NextResponse.redirect(`${origin}/application-pending`);
    }

    // New user always starts as "user" role — send to user dashboard.
    console.info("[auth/callback] New Google user created", {
      userId: user.id,
      databaseRole: defaultRole,
      destination: "/dashboard",
    });
    return NextResponse.redirect(`${origin}/dashboard`);
  }

  // Use the centralized role resolver for consistent routing
  const { resolveAuthenticatedUserAccess } = await import("@/lib/auth/resolve-user-access");
  const access = await resolveAuthenticatedUserAccess(supabase);

  if (access.error || !access.destination) {
    console.error("[auth/callback] Role resolution failed:", access.error);
    // Redirect to profile error page instead of login to avoid redirect loops
    // User is authenticated but profile lookup failed
    return NextResponse.redirect(`${origin}/auth/profile-error?reason=role_lookup_failed`);
  }

  // Handle registration flow for existing users
  if (registrationType && (registrationType === "hospital" || registrationType === "responder")) {
    await createApplication(supabase, user.id, registrationType as ApplicationType);
    return NextResponse.redirect(`${origin}/application-pending`);
  }

  // Handle login flow with portal selection
  if (requestedPortal) {
    // Special handling for hospital and responder portals
    // If user selects hospital/responder but doesn't have that role, create application
    if ((requestedPortal === "hospital" || requestedPortal === "responder") && access.role !== requestedPortal) {
      // Check if application already exists
      const { data: existingApp } = await supabase
        .from("portal_applications")
        .select("id, status")
        .eq("user_id", user.id)
        .eq("application_type", requestedPortal)
        .maybeSingle();

      if (existingApp) {
        // Application exists, redirect based on status
        if (existingApp.status === "pending") {
          return NextResponse.redirect(`${origin}/application-pending`);
        }
        if (existingApp.status === "rejected") {
          return NextResponse.redirect(`${origin}/application-rejected`);
        }
        if (existingApp.status === "suspended") {
          return NextResponse.redirect(`${origin}/login?error=suspended`);
        }
      } else {
        // No application exists, create one
        await createApplication(supabase, user.id, requestedPortal as ApplicationType);
        return NextResponse.redirect(`${origin}/application-pending`);
      }
    }

    // Check if requested portal matches authorized portal
    if (access.destination === `/${requestedPortal}`) {
      return NextResponse.redirect(`${origin}${access.destination}`);
    }

    // Portal mismatch - redirect to authorized portal
    return NextResponse.redirect(`${origin}${access.destination}`);
  }

  // No portal requested - redirect to resolved destination
  console.info("[auth/callback] Resolved access", {
    userId: user.id,
    databaseRole: access.role,
    destination: access.destination,
  });

  return NextResponse.redirect(`${origin}${access.destination}`);
}

async function createApplication(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  applicationType: ApplicationType
): Promise<void> {
  // Check if application already exists
  const { data: existing } = await supabase
    .from("portal_applications")
    .select("id")
    .eq("user_id", userId)
    .eq("application_type", applicationType)
    .maybeSingle();

  if (existing) {
    return;
  }

  // Create new application
  await supabase.from("portal_applications").insert({
    user_id: userId,
    application_type: applicationType,
    status: "pending",
  });
}
