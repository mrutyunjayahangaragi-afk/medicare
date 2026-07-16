/**
 * TEMPORARY DEMO AUTHENTICATION
 * ─────────────────────────────────────────────────────────────────
 * This file exists ONLY for development/demo purposes.
 * It bypasses Supabase authentication using hardcoded credentials.
 *
 * TODO: Remove this file and restore Supabase authentication in Step 5.
 * ─────────────────────────────────────────────────────────────────
 */

export const DEMO_EMAIL = "demo@medicare.com";
export const DEMO_PASSWORD = "Medicare@123";
export const DEMO_SESSION_KEY = "medicare-demo-user";

export const DEMO_PROFILE = {
  id: "demo-user",
  full_name: "John Doe",
  email: "demo@medicare.com",
  phone: "9876543210",
  role: "user" as const,
  hospital_name: null,
  avatar_url: null,
  is_verified: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export const DEMO_STATS = {
  emergencyRequests: 12,
  nearbyHospitals: 8,
  nearbyVolunteers: 46,
  healthTips: 24,
};

export const DEMO_ACTIVITY = [
  {
    id: "1",
    type: "emergency",
    title: "Emergency Request Sent",
    description: "Requested ambulance near MG Road",
    time: "2 hours ago",
    status: "resolved",
  },
  {
    id: "2",
    type: "hospital",
    title: "Nearby Hospital Found",
    description: "Apollo Hospital — 1.2 km away",
    time: "Yesterday",
    status: "info",
  },
  {
    id: "3",
    type: "health",
    title: "Health Tip Viewed",
    description: "CPR Basics — First Aid Guide",
    time: "2 days ago",
    status: "info",
  },
  {
    id: "4",
    type: "volunteer",
    title: "Volunteer Contacted",
    description: "Priya S. — Certified First Responder",
    time: "3 days ago",
    status: "resolved",
  },
];

/** Returns true if the given credentials match the demo account. */
export function isDemoCredentials(email: string, password: string): boolean {
  return email === DEMO_EMAIL && password === DEMO_PASSWORD;
}

/** Store demo session in sessionStorage. Browser-only — never call on server. */
export function setDemoSession(): void {
  sessionStorage.setItem(DEMO_SESSION_KEY, "true");
  sessionStorage.setItem("medicare-demo-profile", JSON.stringify(DEMO_PROFILE));
}

/** Remove demo session from sessionStorage. Browser-only. */
export function clearDemoSession(): void {
  sessionStorage.removeItem(DEMO_SESSION_KEY);
  sessionStorage.removeItem("medicare-demo-profile");
}

/** Check if the demo session is active. Browser-only. */
export function isDemoSessionActive(): boolean {
  return sessionStorage.getItem(DEMO_SESSION_KEY) === "true";
}

/** Get the saved demo profile (with any local edits). */
export function getDemoProfile() {
  try {
    const raw = sessionStorage.getItem("medicare-demo-profile");
    if (raw) return JSON.parse(raw) as typeof DEMO_PROFILE;
  } catch {
    // ignore
  }
  return DEMO_PROFILE;
}

/** Update the demo profile locally (no Supabase call). */
export function updateDemoProfile(updates: Partial<typeof DEMO_PROFILE>): void {
  const current = getDemoProfile();
  sessionStorage.setItem(
    "medicare-demo-profile",
    JSON.stringify({ ...current, ...updates, updated_at: new Date().toISOString() })
  );
}
