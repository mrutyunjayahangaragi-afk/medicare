import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AdminResponderDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createClient();

  const { data: responder } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", params.id)
    .in("role", ["responder", "volunteer"])
    .single();

  if (!responder) {
    redirect("/admin/responders");
  }

  // Get completed request count
  const { count: completedCount } = await supabase
    .from("emergency_requests")
    .select("*", { count: "exact", head: true })
    .eq("assigned_responder_id", params.id)
    .eq("status", "completed");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Responder Details</h1>
          <p className="text-slate-600">Manage responder information and activity</p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
            View History
          </button>
          {responder.account_status === "active" ? (
            <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium">
              Suspend
            </button>
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
                {responder.full_name || "Not provided"}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Email</p>
              <p className="font-medium text-slate-900">
                {responder.email || "Not provided"}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Phone</p>
              <p className="font-medium text-slate-900">
                {responder.phone || "Not provided"}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Role</p>
              <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                {responder.role}
              </span>
            </div>
            <div>
              <p className="text-sm text-slate-500">Availability</p>
              <span
                className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                  responder.availability_status === "available"
                    ? "bg-green-100 text-green-800"
                    : responder.availability_status === "busy"
                    ? "bg-red-100 text-red-800"
                    : "bg-slate-100 text-slate-800"
                } capitalize`}
              >
                {responder.availability_status || "offline"}
              </span>
            </div>
            <div>
              <p className="text-sm text-slate-500">Account Status</p>
              <span
                className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                  responder.account_status === "active"
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                } capitalize`}
              >
                {responder.account_status}
              </span>
            </div>
            <div>
              <p className="text-sm text-slate-500">Created</p>
              <p className="font-medium text-slate-900">
                {new Date(responder.created_at).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Activity Statistics */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Activity Statistics</h2>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-slate-500">Completed Requests</p>
              <p className="font-medium text-slate-900">{completedCount || 0}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Verified</p>
              <p className="font-medium text-slate-900">
                {responder.is_verified ? "Yes" : "No"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
