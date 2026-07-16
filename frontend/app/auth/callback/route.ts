import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { type TrustedRole, type LoginPortal, type RegistrationType, type ApplicationStatus, type ApplicationType } from "@/types/auth";

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
  const { data: existing } = await supabase
    .from("profiles")
    .select("id, role, is_verified")
    .eq("id", user.id)
    .single();

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

    return NextResponse.redirect(`${origin}/dashboard`);
  }

  // Resolve trusted role and authorized portal
  const resolution = await resolveUserPortal(supabase, user.id, existing.role as TrustedRole);

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
        .single();

      if (existingApp) {
        // Application exists, redirect based on status
        if (existingApp.status === "pending") {
          return NextResponse.redirect(`${origin}/application-pending`);
        }
        if (existingApp.status === "rejected") {
          return NextResponse.redirect(`${origin}/login?error=rejected`);
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
      return NextResponse.redirect(`${origin}/login?error=rejected`);
    }

    if (resolution.applicationStatus === "suspended") {
      return NextResponse.redirect(`${origin}/login?error=suspended`);
    }

    // Default to user dashboard
    return NextResponse.redirect(`${origin}/dashboard`);
  }

  // No portal requested - redirect to authorized portal or dashboard
  const redirectPath = resolution.authorizedPortal || "/dashboard";
  return NextResponse.redirect(`${origin}${redirectPath}`);
}

async function resolveUserPortal(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  role: TrustedRole | null
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

  // Check for pending applications
  const { data: application } = await supabase
    .from("portal_applications")
    .select("status, application_type")
    .eq("user_id", userId)
    .eq("status", "pending")
    .single();

  if (application) {
    return {
      trustedRole: role,
      authorizedPortal: null,
      organizationId: null,
      applicationStatus: application.status as ApplicationStatus,
      applicationType: application.application_type as ApplicationType,
    };
  }

  // Check for rejected applications
  const { data: rejectedApp } = await supabase
    .from("portal_applications")
    .select("status")
    .eq("user_id", userId)
    .eq("status", "rejected")
    .single();

  if (rejectedApp) {
    return {
      trustedRole: role,
      authorizedPortal: null,
      organizationId: null,
      applicationStatus: "rejected",
      applicationType: null,
    };
  }

  // Resolve authorized portal based on trusted role
  switch (role) {
    case "user":
      return {
        trustedRole: role,
        authorizedPortal: "dashboard",
        organizationId: null,
        applicationStatus: null,
        applicationType: null,
      };

    case "responder":
      // Check for approved organization membership
      const { data: responderOrg } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", userId)
        .eq("status", "approved")
        .single();

      if (responderOrg) {
        return {
          trustedRole: role,
          authorizedPortal: "responder",
          organizationId: responderOrg.organization_id,
          applicationStatus: null,
          applicationType: null,
        };
      }

      return {
        trustedRole: role,
        authorizedPortal: null,
        organizationId: null,
        applicationStatus: "pending",
        applicationType: "responder",
      };

    case "hospital_staff":
      // Check for approved hospital organization membership
      const { data: hospitalOrg } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", userId)
        .eq("status", "approved")
        .single();

      if (hospitalOrg) {
        return {
          trustedRole: role,
          authorizedPortal: "hospital",
          organizationId: hospitalOrg.organization_id,
          applicationStatus: null,
          applicationType: null,
        };
      }

      return {
        trustedRole: role,
        authorizedPortal: null,
        organizationId: null,
        applicationStatus: "pending",
        applicationType: "hospital",
      };

    case "admin":
      return {
        trustedRole: role,
        authorizedPortal: "admin",
        organizationId: null,
        applicationStatus: null,
        applicationType: null,
      };

    case "volunteer":
      // Volunteers use responder portal
      return {
        trustedRole: role,
        authorizedPortal: "responder",
        organizationId: null,
        applicationStatus: null,
        applicationType: null,
      };

    default:
      return {
        trustedRole: null,
        authorizedPortal: null,
        organizationId: null,
        applicationStatus: null,
        applicationType: null,
      };
  }
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
    .single();

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
