import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SuspendUserDialog from "@/components/admin/SuspendUserDialog";
import RoleChangeDialog from "@/components/admin/RoleChangeDialog";

export default async function AdminUserDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createClient();

  const { data: user } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!user) {
    redirect("/admin/users");
  }

  // Get emergency request count
  const { count: emergencyCount } = await supabase
    .from("emergency_requests")
    .select("*", { count: "exact", head: true })
    .eq("user_id", params.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">User Details</h1>
          <p className="text-slate-600">Manage user account and permissions</p>
        </div>
        <div className="flex gap-3">
          <RoleChangeDialog userId={user.id} currentRole={user.role} />
          {user.account_status === "active" ? (
            <SuspendUserDialog userId={user.id} />
          ) : (
            <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium">
              Reactivate
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Information */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Profile Information</h2>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-slate-500">Name</p>
              <p className="font-medium text-slate-900">
                {user.full_name || "Not provided"}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Email</p>
              <p className="font-medium text-slate-900">
                {user.email || "Not provided"}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Phone</p>
              <p className="font-medium text-slate-900">
                {user.phone || "Not provided"}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Role</p>
              <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                {user.role}
              </span>
            </div>
            <div>
              <p className="text-sm text-slate-500">Account Status</p>
              <span
                className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                  user.account_status === "active"
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                } capitalize`}
              >
                {user.account_status}
              </span>
            </div>
            <div>
              <p className="text-sm text-slate-500">Created</p>
              <p className="font-medium text-slate-900">
                {new Date(user.created_at).toLocaleString()}
              </p>
            </div>
            {user.last_sign_in_at && (
              <div>
                <p className="text-sm text-slate-500">Last Sign In</p>
                <p className="font-medium text-slate-900">
                  {new Date(user.last_sign_in_at).toLocaleString()}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Activity Statistics */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Activity Statistics</h2>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-slate-500">Emergency Requests</p>
              <p className="font-medium text-slate-900">{emergencyCount || 0}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Verified</p>
              <p className="font-medium text-slate-900">
                {user.is_verified ? "Yes" : "No"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
