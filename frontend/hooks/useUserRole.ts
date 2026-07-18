"use client";

/**
 * hooks/useUserRole.ts
 * Client-side hook that resolves the authenticated user's role from Supabase.
 *
 * Usage:
 *   const { role, path, loading, error } = useUserRole();
 *
 * Returns:
 *   role    — "admin" | "hospital_staff" | "responder" | "volunteer" | "user" | null
 *   path    — the correct portal path for this role (/admin, /hospital, etc.)
 *   loading — true while the role is being fetched
 *   error   — non-null when the profile query fails (never silently defaulted)
 *
 * Security rules:
 *   - Always reads role from the database (profiles table).
 *   - Never reads from localStorage or sessionStorage.
 *   - Never trusts client-supplied role values.
 *   - Role query errors are surfaced, not swallowed.
 *   - Use the server helper (lib/auth/get-user-role.ts) for SSR.
 */

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { normalizeRole, getRoleDashboardPath, type NormalizedRole } from "@/lib/auth/get-user-role";

export type ClientRole = NormalizedRole | null;

export interface UseUserRoleResult {
  role: ClientRole;
  path: string;
  loading: boolean;
  userId: string | null;
  error: string | null;
}

export { getRoleDashboardPath as getRolePath };

export function useUserRole(): UseUserRoleResult {
  const [role, setRole]       = useState<ClientRole>(null);
  const [userId, setUserId]   = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function resolve() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user || cancelled) {
          setLoading(false);
          return;
        }

        setUserId(user.id);

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();

        if (cancelled) return;

        if (profileError) {
          // Surface the error — never silently default to "user".
          console.error("[useUserRole] Profile query failed:", profileError.message, profileError.code);
          setError(`Profile query failed: ${profileError.message}`);
          setLoading(false);
          return;
        }

        // normalizeRole trims + lower-cases to prevent "Admin" / " admin" mismatches.
        const normalized = normalizeRole(profile?.role as string | null | undefined);
        setRole(normalized);
      } catch (err: unknown) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : "Unknown error";
          console.error("[useUserRole] Unexpected error:", msg);
          setError(msg);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    resolve();
    return () => { cancelled = true; };
  }, []);

  return {
    role,
    path: getRoleDashboardPath(role),
    loading,
    userId,
    error,
  };
}
