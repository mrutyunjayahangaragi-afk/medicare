"use client";

/**
 * hooks/useUserRole.ts
 * Client-side hook that resolves the authenticated user's role from Supabase.
 *
 * Usage:
 *   const { role, path, loading } = useUserRole();
 *
 * Returns:
 *   role    — "admin" | "hospital_staff" | "responder" | "volunteer" | "user" | null
 *   path    — the correct portal path for this role (/admin, /hospital, etc.)
 *   loading — true while the role is being fetched
 *
 * Rules:
 *   - Always reads role from the database (profiles table) — never from localStorage
 *     or client-supplied values.
 *   - The mapping is identical to the server-side getRoleDashboardPath() helper.
 *   - Use this in client components only (use the server helper for SSR).
 */

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export type ClientRole =
  | "admin"
  | "hospital_staff"
  | "hospital"
  | "responder"
  | "volunteer"
  | "user"
  | null;

export interface UseUserRoleResult {
  role: ClientRole;
  path: string;
  loading: boolean;
  userId: string | null;
}

/**
 * Maps a role string to its portal path.
 * Mirrors lib/auth/get-user-role.ts#getRoleDashboardPath — single source of truth.
 */
export function getRolePath(role: ClientRole | string | null): string {
  switch (role) {
    case "admin":         return "/admin";
    case "hospital_staff":
    case "hospital":      return "/hospital";
    case "responder":
    case "volunteer":     return "/responder";
    default:              return "/dashboard";
  }
}

export function useUserRole(): UseUserRoleResult {
  const [role, setRole]     = useState<ClientRole>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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

        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();

        if (!cancelled) {
          const raw = (profile?.role ?? "user") as string;
          // Normalise to known roles
          if (raw === "admin")                              setRole("admin");
          else if (raw === "hospital_staff" || raw === "hospital") setRole("hospital_staff");
          else if (raw === "responder")                    setRole("responder");
          else if (raw === "volunteer")                    setRole("volunteer");
          else                                              setRole("user");
        }
      } catch {
        if (!cancelled) setRole("user");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    resolve();
    return () => { cancelled = true; };
  }, []);

  return { role, path: getRolePath(role), loading, userId };
}
