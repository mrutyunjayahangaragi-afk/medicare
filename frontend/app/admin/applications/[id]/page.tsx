import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ApproveApplicationDialog from "@/components/admin/ApproveApplicationDialog";
import RejectApplicationDialog from "@/components/admin/RejectApplicationDialog";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // Fetch application without join
  const { data: application, error: applicationError } = await supabase
    .from("portal_applications")
    .select("*")
    .eq("id", id)
    .single();

  if (!application || applicationError) {
    redirect("/admin/applications");
  }

  // Fetch profile separately
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, phone")
    .eq("id", application.user_id)
    .single();

  // Merge profile data
  const applicationWithProfile = {
    ...application,
    profiles: profile || null
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Application Details</h1>
          <p className="text-slate-600">Review and manage this application</p>
        </div>
        <div className="flex gap-3">
          {applicationWithProfile.status === "pending" && (
            <>
              <RejectApplicationDialog applicationId={applicationWithProfile.id} />
              <ApproveApplicationDialog 
                applicationId={applicationWithProfile.id}
                applicationType={applicationWithProfile.application_type}
              />
            </>
          )}
        </div>
      </div>

      {/* Application Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Applicant Information */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Applicant Information</h2>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-slate-500">Name</p>
              <p className="font-medium text-slate-900">
                {applicationWithProfile.profiles?.full_name || "Not provided"}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Email</p>
              <p className="font-medium text-slate-900">
                {applicationWithProfile.profiles?.email || "Not provided"}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Phone</p>
              <p className="font-medium text-slate-900">
                {applicationWithProfile.profiles?.phone || "Not provided"}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Application Type</p>
              <p className="font-medium text-slate-900 capitalize">
                {applicationWithProfile.application_type}
              </p>
            </div>
          </div>
        </div>

        {/* Organization Information */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Organization Information</h2>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-slate-500">Organization Name</p>
              <p className="font-medium text-slate-900">
                {applicationWithProfile.organization_name || "Not provided"}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Address</p>
              <p className="font-medium text-slate-900">
                {applicationWithProfile.address || "Not provided"}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-500">License/Registration Number</p>
              <p className="font-medium text-slate-900">
                {applicationWithProfile.license_or_registration_number || "Not provided"}
              </p>
            </div>
          </div>
        </div>

        {/* Application Status */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Application Status</h2>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-slate-500">Current Status</p>
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  applicationWithProfile.status === "approved"
                    ? "bg-green-100 text-green-800"
                    : applicationWithProfile.status === "rejected"
                    ? "bg-red-100 text-red-800"
                    : applicationWithProfile.status === "suspended"
                    ? "bg-slate-100 text-slate-800"
                    : "bg-amber-100 text-amber-800"
                } capitalize`}
              >
                {applicationWithProfile.status}
              </span>
            </div>
            <div>
              <p className="text-sm text-slate-500">Submitted Date</p>
              <p className="font-medium text-slate-900">
                {new Date(applicationWithProfile.created_at).toLocaleString()}
              </p>
            </div>
            {applicationWithProfile.reviewed_at && (
              <div>
                <p className="text-sm text-slate-500">Reviewed Date</p>
                <p className="font-medium text-slate-900">
                  {new Date(applicationWithProfile.reviewed_at).toLocaleString()}
                </p>
              </div>
            )}
            {applicationWithProfile.rejection_reason && (
              <div>
                <p className="text-sm text-slate-500">Rejection Reason</p>
                <p className="font-medium text-slate-900">
                  {applicationWithProfile.rejection_reason}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Supporting Documents */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Supporting Documents</h2>
          {applicationWithProfile.supporting_document_path ? (
            <a
              href={applicationWithProfile.supporting_document_path}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
            >
              View Document
            </a>
          ) : (
            <p className="text-slate-500">No supporting documents provided</p>
          )}
        </div>
      </div>
    </div>
  );
}
