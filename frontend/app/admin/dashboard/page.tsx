import { createClient } from "@/lib/supabase/server";
import AdminStatsCard from "@/components/admin/AdminStatsCard";
import PendingApplications from "@/components/admin/PendingApplications";
import ActiveEmergencies from "@/components/admin/ActiveEmergencies";
import SystemHealthCard from "@/components/admin/SystemHealthCard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  // Get dashboard statistics
  const [
    { count: totalUsers },
    { count: totalResponders },
    { count: totalHospitals },
    { count: totalRequests },
    { count: activeEmergencies },
    { count: pendingApplications },
    { count: approvedApplications },
    { count: rejectedApplications },
    { count: criticalRequests },
    { count: completedRequests },
    { count: suspendedAccounts },
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("profiles").select("*", { count: "exact", head: true }).in("role", ["responder", "volunteer"]),
    supabase.from("organizations").select("*", { count: "exact", head: true }).eq("organization_type", "hospital"),
    supabase.from("emergency_requests").select("*", { count: "exact", head: true }),
    supabase.from("emergency_requests").select("*", { count: "exact", head: true }).in("status", ["accepted", "in_progress", "arrived"]),
    supabase.from("portal_applications").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("portal_applications").select("*", { count: "exact", head: true }).eq("status", "approved"),
    supabase.from("portal_applications").select("*", { count: "exact", head: true }).eq("status", "rejected"),
    supabase.from("emergency_requests").select("*", { count: "exact", head: true }).eq("severity", "critical").not("status", "in", ["completed", "cancelled"]),
    supabase.from("emergency_requests").select("*", { count: "exact", head: true }).eq("status", "completed"),
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("account_status", "suspended"),
  ]);

  const stats = {
    totalUsers: totalUsers || 0,
    totalResponders: totalResponders || 0,
    totalHospitals: totalHospitals || 0,
    totalRequests: totalRequests || 0,
    activeEmergencies: activeEmergencies || 0,
    pendingApplications: pendingApplications || 0,
    approvedApplications: approvedApplications || 0,
    rejectedApplications: rejectedApplications || 0,
    criticalRequests: criticalRequests || 0,
    completedRequests: completedRequests || 0,
    suspendedAccounts: suspendedAccounts || 0,
  };

  // Get pending applications (without join to avoid RLS issues)
  const { data: applications } = await supabase
    .from("portal_applications")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(5);

  // Fetch profiles separately
  const userIds = applications?.map(app => app.user_id) || [];
  const { data: profiles } = userIds.length > 0 
    ? await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds)
    : { data: [] };

  // Create a map for quick lookup
  const profileMap = new Map(
    (profiles || []).map(p => [p.id, p])
  );

  // Merge applications with profile data
  const applicationsWithProfiles = (applications || []).map(app => ({
    ...app,
    profiles: profileMap.get(app.user_id) || null
  }));

  // Get active critical emergencies (without join)
  const { data: criticalEmergencies } = await supabase
    .from("emergency_requests")
    .select("*")
    .eq("severity", "critical")
    .in("status", ["accepted", "in_progress", "arrived"])
    .order("created_at", { ascending: false })
    .limit(5);

  // Fetch profiles for emergencies
  const emergencyUserIds = criticalEmergencies?.map(req => req.user_id) || [];
  const { data: emergencyProfiles } = emergencyUserIds.length > 0 
    ? await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", emergencyUserIds)
    : { data: [] };

  // Create a map for emergencies
  const emergencyProfileMap = new Map(
    (emergencyProfiles || []).map(p => [p.id, p])
  );

  // Merge emergencies with profile data
  const emergenciesWithProfiles = (criticalEmergencies || []).map(req => ({
    ...req,
    profiles: emergencyProfileMap.get(req.user_id) || null
  }));

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-600">Platform overview and statistics</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <AdminStatsCard
          title="Total Users"
          value={stats.totalUsers}
          icon="users"
          color="blue"
        />
        <AdminStatsCard
          title="Responders"
          value={stats.totalResponders}
          icon="shield"
          color="green"
        />
        <AdminStatsCard
          title="Hospitals"
          value={stats.totalHospitals}
          icon="building"
          color="purple"
        />
        <AdminStatsCard
          title="Active Emergencies"
          value={stats.activeEmergencies}
          icon="alert"
          color="red"
        />
        <AdminStatsCard
          title="Pending Applications"
          value={stats.pendingApplications}
          icon="file"
          color="amber"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Applications */}
        <PendingApplications applications={applicationsWithProfiles || []} />

        {/* Active Critical Emergencies */}
        <ActiveEmergencies emergencies={emergenciesWithProfiles || []} />
      </div>

      {/* Applications Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <AdminStatsCard
          title="Applications: Pending"
          value={stats.pendingApplications}
          icon="file"
          color="amber"
        />
        <AdminStatsCard
          title="Applications: Approved"
          value={stats.approvedApplications}
          icon="check"
          color="green"
        />
        <AdminStatsCard
          title="Applications: Rejected"
          value={stats.rejectedApplications}
          icon="ban"
          color="red"
        />
      </div>

      {/* Requests Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminStatsCard
          title="Critical Requests"
          value={stats.criticalRequests}
          icon="alert"
          color="red"
        />
        <AdminStatsCard
          title="Completed Requests"
          value={stats.completedRequests}
          icon="check"
          color="green"
        />
        <AdminStatsCard
          title="Total Requests"
          value={stats.totalRequests}
          icon="activity"
          color="blue"
        />
        <AdminStatsCard
          title="Suspended Accounts"
          value={stats.suspendedAccounts}
          icon="ban"
          color="slate"
        />
      </div>

      {/* System Health */}
      <SystemHealthCard />
    </div>
  );
}
