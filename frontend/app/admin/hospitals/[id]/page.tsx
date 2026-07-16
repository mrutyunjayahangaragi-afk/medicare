import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AdminHospitalDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createClient();

  const { data: hospital } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", params.id)
    .eq("organization_type", "hospital")
    .single();

  if (!hospital) {
    redirect("/admin/hospitals");
  }

  // Get staff count
  const { count: staffCount } = await supabase
    .from("organization_members")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", params.id)
    .eq("status", "approved");

  // Get active requests count
  const { count: activeRequests } = await supabase
    .from("emergency_requests")
    .select("*", { count: "exact", head: true })
    .eq("recommended_hospital_id", params.id)
    .in("status", ["accepted", "in_progress", "arrived"]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Hospital Details</h1>
          <p className="text-slate-600">Manage hospital information and staff</p>
        </div>
        <div className="flex gap-3">
          {hospital.is_verified ? (
            <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium">
              Suspend
            </button>
          ) : (
            <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium">
              Verify
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hospital Information */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Hospital Information</h2>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-slate-500">Name</p>
              <p className="font-medium text-slate-900">{hospital.name}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Address</p>
              <p className="font-medium text-slate-900">
                {hospital.address || "Not specified"}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Phone</p>
              <p className="font-medium text-slate-900">
                {hospital.phone || "Not specified"}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Verification Status</p>
              <span
                className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                  hospital.is_verified
                    ? "bg-green-100 text-green-800"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {hospital.is_verified ? "Verified" : "Pending"}
              </span>
            </div>
            <div>
              <p className="text-sm text-slate-500">Created</p>
              <p className="font-medium text-slate-900">
                {new Date(hospital.created_at).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Capacity Information */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Capacity Information</h2>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-slate-500">Staff Count</p>
              <p className="font-medium text-slate-900">{staffCount || 0}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Bed Capacity</p>
              <p className="font-medium text-slate-900">
                {hospital.bed_capacity || "Not specified"}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Available Ambulances</p>
              <p className="font-medium text-slate-900">
                {hospital.available_ambulances || 0}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Active Requests</p>
              <p className="font-medium text-slate-900">{activeRequests || 0}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
