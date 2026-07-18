import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import TopNavbar from "@/components/dashboard/TopNavbar";
import WelcomeCard from "@/components/dashboard/WelcomeCard";
import EmergencySOS from "@/components/dashboard/EmergencySOS";
import StatsSection from "@/components/dashboard/StatsSection";
import RecentRequests, { type EmergencyRequest } from "@/components/dashboard/RecentRequests";
import NearbyHelp from "@/components/dashboard/NearbyHelp";
import EmergencyContacts from "@/components/dashboard/EmergencyContacts";
import HealthTips from "@/components/dashboard/HealthTips";
import { normalizeRole } from "@/lib/auth/get-user-role";
import type { EmergencyContact } from "@/types/database";

export const metadata: Metadata = {
  title: "User Dashboard — Medicare",
};

// Always fetch fresh data — never serve a stale server-component render
export const revalidate = 0;
export const dynamic = "force-dynamic";

function mapStatus(status: string): EmergencyRequest["status"] {
  switch (status) {
    case "pending":
      return "Pending";
    case "accepted":
      return "Accepted";
    case "in_progress":
    case "arrived":
    case "volunteer_assigned":
    case "hospital_assigned":
      return "In Progress";
    case "completed":
      return "Completed";
    case "cancelled":
      return "Cancelled";
    default:
      return "Pending";
  }
}

function mapSeverity(severity: string): EmergencyRequest["severity"] {
  switch (severity) {
    case "low":
      return "Low";
    case "medium":
      return "Medium";
    case "high":
      return "High";
    case "critical":
    default:
      return "Critical";
  }
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch optional profile info — use maybeSingle() to avoid PGRST116 error on missing row.
  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    // Surface the error — do not silently continue with a null profile.
    console.error("[Dashboard] Profile query failed for userId:", user.id, profileError.message, profileError.code);
    // Redirect to login on a hard query failure so the user knows something is wrong.
    redirect("/login?error=profile_error");
  }

  // Check if it is an email/password user vs Google OAuth user.
  // Google OAuth users don't require verification or is_verified check.
  const isGoogleUser =
    user.app_metadata?.provider === "google" ||
    user.identities?.some((id) => id.provider === "google");

  if (!isGoogleUser) {
    // Email/password users must have confirmed their email address.
    // is_verified is set to true by auth/callback after email confirmation.
    // We also trust email_confirmed_at from the Supabase JWT as a fallback,
    // so users who confirmed but haven't gone through the callback yet still
    // get in rather than being sent back to login in a loop.
    const emailConfirmed = Boolean(user.email_confirmed_at);
    const profileVerified = Boolean(profileData?.is_verified);
    if (!emailConfirmed && !profileVerified) {
      redirect("/login");
    }
  }

  // Role-based redirect — every non-user role must be sent to their own portal.
  // Never render the user dashboard for hospital, responder, or admin accounts.
  // normalizeRole trims + lower-cases to prevent case mismatches.
  if (profileData) {
    const role = normalizeRole(profileData.role as string);

    console.info("[Dashboard] Resolved access", {
      userId: user.id,
      databaseRole: role,
      destination: role === "admin" ? "/admin" : role === "hospital_staff" ? "/hospital" : role === "responder" || role === "volunteer" ? "/responder" : "/dashboard",
    });

    if (role === "admin")                                      redirect("/admin");
    if (role === "hospital_staff")                             redirect("/hospital");
    if (role === "responder" || role === "volunteer")          redirect("/responder");
    // "user" role — fall through and render the dashboard.
  }

  // Resolve user info safely for presentation
  const resolvedEmail = user.email || "";
  const resolvedName =
    profileData?.full_name ||
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    resolvedEmail.split("@")[0] ||
    "User";

  const resolvedAvatar =
    profileData?.avatar_url ||
    user.user_metadata?.avatar_url ||
    user.user_metadata?.picture ||
    null;

  const resolvedUser = {
    email: resolvedEmail,
    fullName: resolvedName,
    avatarUrl: resolvedAvatar,
  };

  // Fetch real emergency requests from Supabase
  const { data: requestsData, error: requestsError } = await supabase
    .from("emergency_requests")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (requestsError) {
    if (requestsError.message?.includes("Could not find the table") || requestsError.code === "PGRST116" || requestsError.code === "42P01") {
      console.warn("[Medicare Dashboard] 'emergency_requests' table is not yet configured in Supabase. Using fallback empty state.");
    } else {
      console.error("[Medicare Dashboard] Requests query error:", requestsError.message);
    }
  }

  // Fetch emergency contacts count and list
  const { data: contactsData, error: contactsError } = await supabase
    .from("emergency_contacts")
    .select("*")
    .eq("user_id", user.id)
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: false });

  if (contactsError && contactsError.code !== "42P01") {
    console.error("[Medicare Dashboard] Contacts query error:", contactsError.message);
  }

  const contacts = contactsData ?? [];

  // Map requests to Dashboard UI structure
  const requests: EmergencyRequest[] = (requestsData || []).map((req) => ({
    id: req.id,
    emergencyType: req.emergency_type,
    createdAt: req.created_at,
    location:
      req.manual_address ||
      (req.latitude && req.longitude
        ? `${Number(req.latitude).toFixed(4)}, ${Number(req.longitude).toFixed(4)}`
        : "Location unavailable"),
    severity: mapSeverity(req.severity),
    status: mapStatus(req.status),
  }));

  // Calculate statistics from real data
  const totalRequests     = requests.length;
  const pendingRequests   = requests.filter((r) => r.status === "Pending").length;
  const activeRequests    = requests.filter((r) =>
    r.status === "Accepted" || r.status === "In Progress"
  ).length;
  const completedRequests = requests.filter((r) => r.status === "Completed").length;
  const emergencyContactsCount = contacts.length;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* 1. Sticky Header */}
      <TopNavbar user={resolvedUser} />

      {/* Main Content Area */}
      <main
        id="main-content"
        className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 lg:pb-8 space-y-6 bg-slate-50/50"
      >
        {/* 2. Welcome Card */}
        <WelcomeCard user={resolvedUser} />

        {/* 3. SOS Card */}
        <EmergencySOS />

        {/* 4. Stats Section */}
        <StatsSection
          totalRequests={totalRequests}
          activeRequests={activeRequests}
          pendingRequests={pendingRequests}
          completedRequests={completedRequests}
          emergencyContactsCount={emergencyContactsCount}
        />

        {/* 5. Recent Requests */}
        <RecentRequests requests={requests.slice(0, 5)} />

        {/* 6. Nearby Help */}
        <NearbyHelp />

        {/* 7. Emergency Contacts */}
        <EmergencyContacts contacts={contacts} />

        {/* 8. Health Tips */}
        <HealthTips />
      </main>
    </div>
  );
}
