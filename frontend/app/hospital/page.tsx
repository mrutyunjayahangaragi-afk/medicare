import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import HospitalStats from "@/components/hospital/HospitalStats";
import IncomingRequests from "@/components/hospital/IncomingRequests";
import RecentActivity from "@/components/hospital/RecentActivity";

export default async function HospitalDashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch hospital profile
  const { data: hospitalProfile } = await supabase
    .from("hospital_profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!hospitalProfile) {
    redirect("/hospital/profile");
  }

  // Fetch dashboard stats from backend API
  const statsResponse = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/v1/hospital/dashboard`,
    {
      headers: {
        Authorization: `Bearer ${await supabase.auth.getSession().then((s) => s.data.session?.access_token)}`,
      },
    }
  );

  const stats = statsResponse.ok ? await statsResponse.json() : null;

  // Fetch incoming requests
  const requestsResponse = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/v1/hospital/requests?status=assigned&limit=10`,
    {
      headers: {
        Authorization: `Bearer ${await supabase.auth.getSession().then((s) => s.data.session?.access_token)}`,
      },
    }
  );

  const requests = requestsResponse.ok ? await requestsResponse.json() : null;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">
          Hospital Dashboard
        </h1>
        <p className="text-slate-600 mt-1">
          Welcome back, {hospitalProfile.hospital_name}
        </p>
      </div>

      {/* Stats */}
      {stats?.data && <HospitalStats stats={stats.data} />}

      {/* Incoming Requests */}
      {requests?.data && (
        <IncomingRequests requests={requests.data.items || []} />
      )}

      {/* Recent Activity */}
      <RecentActivity />
    </div>
  );
}
