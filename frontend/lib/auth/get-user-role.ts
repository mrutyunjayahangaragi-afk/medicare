/**
 * lib/auth/get-user-role.ts
 * Server-side role resolver — single source of truth for role-to-portal mapping.
 *
 * Usage (Server Components / Route Handlers only):
 *   import { getUserRole, getRoleDashboardPath } from "@/lib/auth/get-user-role";
 *   const role = await getUserRole(supabase, userId);
 *   const path = getRoleDashboardPath(role);
 *
 * Role priority (highest wins):
 *   admin > hospital_staff > responder > volunteer > user
 *
 * Security rules:
 *   - Never use localStorage.
 *   - Never trust client-supplied role values.
 *   - Role is always read from the server-side Supabase session.
 *   - Role query errors are thrown — never silently defaulted to "user".
 *   - Role strings are trimmed + lower-cased before comparison.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

/** Canonical normalized roles returned by getUserRole(). */
export type NormalizedRole =
  | "admin"
  | "hospital_staff"
  | "responder"
  | "volunteer"
  | "user";

/**
 * Read the user's role from public.profiles.
 *
 * Uses maybeSingle() so a missing profile row returns null data instead of
 * throwing a PGRST116 error.
 *
 * Throws an error if the Supabase query itself fails (e.g. RLS, network) so
 * callers are never silently degraded to "user" on a broken query.
 */
export async function getUserRole(
  supabase: SupabaseClient,
  userId: string
): Promise<NormalizedRole> {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    // Surface the error instead of silently falling back to "user".
    // This makes RLS blocks, network failures, and schema problems visible.
    throw new Error(
      `[getUserRole] Profile query failed for userId=${userId}: ${error.message} (code=${error.code})`
    );
  }

  // Profile row not found — new user with no profile yet
  if (!profile?.role) return "user";

  return normalizeRole(profile.role as string);
}

/**
 * Normalize a raw role string to one of the canonical NormalizedRole values.
 * Trims whitespace and lower-cases before comparing so "Admin " and "ADMIN"
 * both resolve correctly.
 */
export function normalizeRole(raw: string | null | undefined): NormalizedRole {
  const r = (raw ?? "").trim().toLowerCase();
  if (r === "admin")                             return "admin";
  if (r === "hospital_staff" || r === "hospital") return "hospital_staff";
  if (r === "responder")                         return "responder";
  if (r === "volunteer")                         return "volunteer";
  return "user";
}

/**
 * Return the root dashboard path for a given normalized role.
 * Used after login and in portal guards.
 */
export function getRoleDashboardPath(role: NormalizedRole | string | null): string {
  const r = (role ?? "").trim().toLowerCase();
  switch (r) {
    case "admin":         return "/admin";
    case "hospital_staff":
    case "hospital":      return "/hospital";
    case "responder":
    case "volunteer":     return "/responder";
    default:              return "/dashboard";
  }
}

/**
 * Convenience: get both the role and its dashboard path in one call.
 * Throws if the profile query fails — never silently defaults.
 */
export async function getUserRoleAndPath(
  supabase: SupabaseClient,
  userId: string
): Promise<{ role: NormalizedRole; path: string }> {
  const role = await getUserRole(supabase, userId);
  return { role, path: getRoleDashboardPath(role) };
}
