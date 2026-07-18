import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { type TrustedRole, type LoginPortal, type RegistrationType, type ApplicationStatus, type ApplicationType } from "@/types/auth";
import { normalizeRole } from "@/lib/auth/get-user-role";

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

    await supabase.from("profiles").upsert(
      {
        id: user.id,
        full_name: (meta.full_name as string | null) ?? (meta.name as string | null) ?? null,
        email: user.email ?? null,
        phone: null,
        role: defaultRole,
        hospital_name: null,
        avatar_url: (meta.avatar_url as string | null) ?? (meta.picture as string | null) ?? null,
        is_verified: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

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

  // Resolve trusted role and authorized portal.
  // normalizeRole trims + lower-cases to prevent "Admin" vs "admin" mismatches.
  const normalizedRole = normalizeRole(existing.role as string | null);
  const resolution = await resolveUserPortal(supabase, user.id, normalizedRole);

  // Handle registration flow for existing users
  if (registrationType && (registrationType === "hospital" || registrationType === "responder")) {
    await createApplication(supabase, user.id, registrationType as ApplicationType);
    return NextResponse.redirect(`${origin}/application-pending`);
  }

  // Handle login flow with portal selection
  if (requestedPortal) {
    // Special handling for hospital and responder portals
    // If user selects hospital/responder but doesn't have an application, create one
    if ((requestedPortal === "hospital" || requestedPortal === "responder") && !resolution.authorizedPortal) {
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
    if (resolution.authorizedPortal === requestedPortal) {
      return NextResponse.redirect(`${origin}/${resolution.authorizedPortal}`);
    }

    // Portal mismatch - redirect to authorized portal with error
    if (resolution.authorizedPortal) {
      return NextResponse.redirect(`${origin}/${resolution.authorizedPortal}`);
    }

    // No authorized portal (e.g., pending application)
    if (resolution.applicationStatus === "pending") {
      return NextResponse.redirect(`${origin}/application-pending`);
    }

    if (resolution.applicationStatus === "rejected") {
      return NextResponse.redirect(`${origin}/application-rejected`);
    }

    if (resolution.applicationStatus === "suspended") {
      return NextResponse.redirect(`${origin}/login?error=suspended`);
    }

    // Default to user dashboard
    return NextResponse.redirect(`${origin}/dashboard`);
  }

  // No portal requested - redirect to authorized portal or dashboard
  const rawPortal = resolution.authorizedPortal ?? "dashboard";
  // Ensure the portal has a leading slash
  const redirectPath = rawPortal.startsWith("/") ? rawPortal : `/${rawPortal}`;

  console.info("[auth/callback] Resolved access", {
    userId: user.id,
    databaseRole: resolution.trustedRole,
    destination: redirectPath,
  });

  return NextResponse.redirect(`${origin}${redirectPath}`);
}

async function resolveUserPortal(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  role: TrustedRole | string | null
): Promise<{
  trustedRole: TrustedRole | null;
  authorizedPortal: string | null;
  organizationId: string | null;
  applicationStatus: ApplicationStatus | null;
  applicationType: ApplicationType | null;
}> {
  if (!role) {
    return {
      trustedRole: null,
      authorizedPortal: null,
      organizationId: null,
      applicationStatus: null,
      applicationType: null,
    };
  }

  // Approved users (hospital_staff, responder, admin) have their role set —
  // go straight to portal. Only check pending applications for "user" role
  // since they don't have a portal role yet.
  if (role !== "user") {
    // Role is already elevated — skip application status checks and go to portal
    switch (role) {
      case "admin":
        return { trustedRole: role, authorizedPortal: "admin", organizationId: null, applicationStatus: null, applicationType: null };
      case "hospital_staff":
      case "hospital": {
        const { data: hospitalOrg } = await supabase
          .from("organization_members")
          .select("organization_id")
          .eq("user_id", userId)
          .eq("status", "approved")
          .maybeSingle();
        return {
          trustedRole: role as TrustedRole,
          authorizedPortal: "hospital",
          organizationId: hospitalOrg?.organization_id ?? null,
          applicationStatus: null,
          applicationType: null,
        };
      }
      case "responder":
      case "volunteer":
        return { trustedRole: role as TrustedRole, authorizedPortal: "responder", organizationId: null, applicationStatus: null, applicationType: null };
    }
  }

  // For "user" role — check pending / rejected applications before redirecting
  // Check for pending applications
  const { data: application } = await supabase
    .from("portal_applications")
    .select("status, application_type")
    .eq("user_id", userId)
    .eq("status", "pending")
    .maybeSingle();

  if (application) {
    return {
      trustedRole: role as TrustedRole,
      authorizedPortal: null,
      organizationId: null,
      applicationStatus: application.status as ApplicationStatus,
      applicationType: application.application_type as ApplicationType,
    };
  }

  // Check for rejected applications (user role still, never approved)
  const { data: rejectedApp } = await supabase
    .from("portal_applications")
    .select("status")
    .eq("user_id", userId)
    .eq("status", "rejected")
    .maybeSingle();

  if (rejectedApp) {
    return {
      trustedRole: role as TrustedRole,
      authorizedPortal: null,
      organizationId: null,
      applicationStatus: "rejected",
      applicationType: null,
    };
  }

  // Plain user with no application
  return {
    trustedRole: role as TrustedRole,
    authorizedPortal: "dashboard",
    organizationId: null,
    applicationStatus: null,
    applicationType: null,
  };
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
