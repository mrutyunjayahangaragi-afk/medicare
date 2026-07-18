import { createClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";

export type AppRole = "user" | "hospital" | "responder" | "admin";

export const ROLE_DESTINATIONS: Record<AppRole, string> = {
  user: "/dashboard",
  hospital: "/hospital",
  responder: "/responder",
  admin: "/admin",
};

export interface UserAccess {
  user: {
    id: string;
    email: string | null | undefined;
  };
  profile: {
    id: string;
    role: string | null;
    full_name: string | null;
  } | null;
  role: AppRole | null;
  destination: string | null;
  error: string | null;
}

/**
 * Resolve authenticated user access by:
 * 1. Getting the authenticated user
 * 2. Fetching their profile with the correct UUID column (id)
 * 3. Normalizing the role
 * 4. Determining the destination
 * 
 * Never silently defaults to "user". If role lookup fails, returns error.
 */
export async function resolveAuthenticatedUserAccess(
  supabase?: SupabaseClient
): Promise<UserAccess> {
  const client = supabase || createClient();

  console.info("[resolveAuthenticatedUserAccess] Starting role resolution");

  // Step 1: Get authenticated user
  const { data: { user }, error: userError } = await client.auth.getUser();

  if (userError) {
    console.error("[resolveAuthenticatedUserAccess] Auth getUser failed:", userError.message, userError.code);
    return {
      user: { id: "", email: null },
      profile: null,
      role: null,
      destination: null,
      error: "Authentication failed. Please sign in again.",
    };
  }

  if (!user) {
    console.warn("[resolveAuthenticatedUserAccess] No authenticated user found");
    return {
      user: { id: "", email: null },
      profile: null,
      role: null,
      destination: null,
      error: "No authenticated session. Please sign in.",
    };
  }

  console.info("[resolveAuthenticatedUserAccess] Authenticated user:", user.id);

  // Step 2: Fetch profile using correct UUID column (id = auth.users.id)
  const { data: profile, error: profileError } = await client
    .from("profiles")
    .select("id, role, full_name")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("[resolveAuthenticatedUserAccess] Profile query failed:", profileError.message, profileError.code);
    return {
      user: { id: user.id, email: user.email },
      profile: null,
      role: null,
      destination: null,
      error: "Could not load your account profile. Please try again.",
    };
  }

  if (!profile) {
    console.warn("[resolveAuthenticatedUserAccess] No profile found for user:", user.id);
    return {
      user: { id: user.id, email: user.email },
      profile: null,
      role: null,
      destination: null,
      error: "Account profile not found. Please contact support.",
    };
  }

  console.info("[resolveAuthenticatedUserAccess] Profile found:", { id: profile.id, role: profile.role });

  // Step 3: Normalize role
  const rawRole = profile.role as string | null;
  const normalizedRole = normalizeRole(rawRole);

  console.info("[resolveAuthenticatedUserAccess] Normalized role:", normalizedRole);

  // Step 4: Determine destination
  const destination = normalizedRole ? ROLE_DESTINATIONS[normalizedRole] : null;

  if (!destination) {
    console.error("[resolveAuthenticatedUserAccess] Unknown role:", rawRole);
    return {
      user: { id: user.id, email: user.email },
      profile: { id: profile.id, role: profile.role, full_name: profile.full_name },
      role: normalizedRole,
      destination: null,
      error: `Unknown account role: ${rawRole}. Please contact support.`,
    };
  }

  console.info("[resolveAuthenticatedUserAccess] Resolved destination:", destination);

  return {
    user: { id: user.id, email: user.email },
    profile: { id: profile.id, role: profile.role, full_name: profile.full_name },
    role: normalizedRole,
    destination,
    error: null,
  };
}

/**
 * Normalize role string to canonical AppRole
 * Trims whitespace and lowercases to prevent case mismatches
 */
function normalizeRole(raw: string | null | undefined): AppRole | null {
  if (!raw) return null;

  const r = raw.trim().toLowerCase();

  if (r === "admin") return "admin";
  if (r === "hospital_staff" || r === "hospital") return "hospital";
  if (r === "responder" || r === "volunteer") return "responder";
  if (r === "user") return "user";

  return null; // Unknown role - do not default
}
