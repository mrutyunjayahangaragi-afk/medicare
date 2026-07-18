import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import HospitalSidebar from "@/components/hospital/HospitalSidebar";

export default async function HospitalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch profile to check role - use maybeSingle() to avoid PGRST116 error
  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("[HospitalLayout] Profile query failed:", profileError.message, profileError.code);
    redirect("/login?error=profile_error");
  }

  // Check if user has hospital_staff role.
  // Also handle the legacy "hospital" role value that may exist in older profiles.
  const role = profileData?.role as string | undefined;
  if (!profileData || (role !== "hospital_staff" && role !== "hospital")) {
    // Check if this is a regular user who has a pending application
    const { data: pendingApp } = await supabase
      .from("portal_applications")
      .select("status")
      .eq("user_id", user.id)
      .eq("application_type", "hospital")
      .maybeSingle();

    if (pendingApp?.status === "pending") {
      redirect("/application-pending");
    }
    if (pendingApp?.status === "rejected") {
      redirect("/application-rejected");
    }
    redirect("/unauthorized");
  }

  // Check for approved hospital organization membership
  const { data: organizationMember } = await supabase
    .from("organization_members")
    .select("organization_id, status")
    .eq("user_id", user.id)
    .eq("status", "approved")
    .maybeSingle();

  if (!organizationMember) {
    redirect("/unauthorized");
  }

  // Verify organization is a hospital
  const { data: organization } = await supabase
    .from("organizations")
    .select("organization_type, is_verified")
    .eq("id", organizationMember.organization_id)
    .maybeSingle();

  if (!organization || organization.organization_type !== "hospital" || !organization.is_verified) {
    redirect("/unauthorized");
  }

  // Check if hospital profile exists
  const { data: hospitalProfile } = await supabase
    .from("hospital_profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  const userFullName =
    profileData?.full_name ||
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split("@")[0] ||
    "Hospital User";

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <HospitalSidebar
        userName={userFullName}
        hasProfile={!!hospitalProfile}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
