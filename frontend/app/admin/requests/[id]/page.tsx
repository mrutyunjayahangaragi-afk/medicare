import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AdminRequestDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createClient();

  const { data: request } = await supabase
    .from("emergency_requests")
    .select(`
      *,
      profiles:user_id (
        full_name,
        email,
        phone
      )
    `)
    .eq("id", params.id)
    .single();

  if (!request) {
    redirect("/admin/requests");
  }

  // Get assigned responder info
  let responder = null;
  if (request.assigned_responder_id) {
    const { data } = await supabase
      .from("profiles")
      .select("full_name, phone")
      .eq("id", request.assigned_responder_id)
      .single();
    responder = data;
  }

  // Get recommended hospital info
  let hospital = null;
  if (request.recommended_hospital_id) {
    const { data } = await supabase
      .from("organizations")
      .select("name, phone, address")
      .eq("id", request.recommended_hospital_id)
      .single();
    hospital = data;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Emergency Request Details</h1>
        <p className="text-slate-600">View emergency request information</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Request Information */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Request Information</h2>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-slate-500">Request ID</p>
              <p className="font-medium text-slate-900">{request.id}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Emergency Type</p>
              <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                {request.emergency_type}
              </span>
            </div>
            <div>
              <p className="text-sm text-slate-500">Severity</p>
              <span
                className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                  request.severity === "critical"
                    ? "bg-red-100 text-red-800"
                    : request.severity === "high"
                    ? "bg-orange-100 text-orange-800"
                    : request.severity === "medium"
                    ? "bg-yellow-100 text-yellow-800"
                    : "bg-green-100 text-green-800"
                } capitalize`}
              >
                {request.severity}
              </span>
            </div>
            <div>
              <p className="text-sm text-slate-500">Status</p>
              <span
                className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                  request.status === "completed"
                    ? "bg-green-100 text-green-800"
                    : request.status === "cancelled"
                    ? "bg-slate-100 text-slate-800"
                    : request.status === "arrived"
                    ? "bg-blue-100 text-blue-800"
                    : request.status === "in_progress"
                    ? "bg-purple-100 text-purple-800"
                    : "bg-amber-100 text-amber-800"
                } capitalize`}
              >
                {request.status}
              </span>
            </div>
            <div>
              <p className="text-sm text-slate-500">Description</p>
              <p className="font-medium text-slate-900">{request.description}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Location</p>
              <p className="font-medium text-slate-900">
                {request.location_label || "Not specified"}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Created</p>
              <p className="font-medium text-slate-900">
                {new Date(request.created_at).toLocaleString()}
              </p>
            </div>
            {request.completed_at && (
              <div>
                <p className="text-sm text-slate-500">Completed</p>
                <p className="font-medium text-slate-900">
                  {new Date(request.completed_at).toLocaleString()}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* User Information */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">User Information</h2>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-slate-500">Name</p>
              <p className="font-medium text-slate-900">
                {request.profiles?.full_name || "Unknown"}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Email</p>
              <p className="font-medium text-slate-900">
                {request.profiles?.email || "Not provided"}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Phone</p>
              <p className="font-medium text-slate-900">
                {request.profiles?.phone || "Not provided"}
              </p>
            </div>
          </div>
        </div>

        {/* Assigned Responder */}
        {responder && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Assigned Responder</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-slate-500">Name</p>
                <p className="font-medium text-slate-900">{responder.full_name}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Phone</p>
                <p className="font-medium text-slate-900">{responder.phone || "Not provided"}</p>
              </div>
            </div>
          </div>
        )}

        {/* Recommended Hospital */}
        {hospital && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Recommended Hospital</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-slate-500">Name</p>
                <p className="font-medium text-slate-900">{hospital.name}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Address</p>
                <p className="font-medium text-slate-900">{hospital.address || "Not specified"}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Phone</p>
                <p className="font-medium text-slate-900">{hospital.phone || "Not provided"}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
