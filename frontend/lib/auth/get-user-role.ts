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
 * Never use localStorage. Never trust client-supplied role values.
 * Role is always read from the server-side Supabase session.
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
 * Falls back to "user" if the profile row is missing.
 */
export async function getUserRole(
  supabase: SupabaseClient,
  userId: string
): Promise<NormalizedRole> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  if (!profile?.role) return "user";

  const r = profile.role as string;

  // Map any legacy/alias values to the canonical set
  if (r === "admin")         return "admin";
  if (r === "hospital_staff" || r === "hospital") return "hospital_staff";
  if (r === "responder")     return "responder";
  if (r === "volunteer")     return "volunteer";
  return "user";
}

/**
 * Return the root dashboard path for a given normalized role.
 * Used after login and in portal guards.
 */
export function getRoleDashboardPath(role: NormalizedRole | string | null): string {
  switch (role) {
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
 */
export async function getUserRoleAndPath(
  supabase: SupabaseClient,
  userId: string
): Promise<{ role: NormalizedRole; path: string }> {
  const role = await getUserRole(supabase, userId);
  return { role, path: getRoleDashboardPath(role) };
}
