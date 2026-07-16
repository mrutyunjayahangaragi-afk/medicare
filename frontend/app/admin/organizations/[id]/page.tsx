import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AdminOrganizationDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createClient();

  const { data: organization } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!organization) {
    redirect("/admin/organizations");
  }

  // Get member count
  const { count: memberCount } = await supabase
    .from("organization_members")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", params.id)
    .eq("status", "approved");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Organization Details</h1>
          <p className="text-slate-600">Manage organization information</p>
        </div>
        <div className="flex gap-3">
          {organization.is_verified ? (
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
        {/* Organization Information */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Organization Information</h2>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-slate-500">Name</p>
              <p className="font-medium text-slate-900">{organization.name}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Type</p>
              <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                {organization.organization_type}
              </span>
            </div>
            <div>
              <p className="text-sm text-slate-500">Address</p>
              <p className="font-medium text-slate-900">
                {organization.address || "Not specified"}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Phone</p>
              <p className="font-medium text-slate-900">
                {organization.phone || "Not specified"}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Verification Status</p>
              <span
                className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                  organization.is_verified
                    ? "bg-green-100 text-green-800"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {organization.is_verified ? "Verified" : "Pending"}
              </span>
            </div>
            <div>
              <p className="text-sm text-slate-500">Created</p>
              <p className="font-medium text-slate-900">
                {new Date(organization.created_at).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Statistics</h2>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-slate-500">Member Count</p>
              <p className="font-medium text-slate-900">{memberCount || 0}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Bed Capacity</p>
              <p className="font-medium text-slate-900">
                {organization.bed_capacity || "Not specified"}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Available Ambulances</p>
              <p className="font-medium text-slate-900">
                {organization.available_ambulances || 0}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
