"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, Loader2 } from "lucide-react";
import { approveAdminApplication } from "@/lib/api/client";
import { ApiError } from "@/lib/api/client";

interface ApproveApplicationDialogProps {
  applicationId: string;
  applicationType: string;
}

export default function ApproveApplicationDialog({
  applicationId,
  applicationType,
}: ApproveApplicationDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleApprove = async () => {
    setLoading(true);
    setError("");
    try {
      await approveAdminApplication(applicationId);
      setIsOpen(false);
      router.push("/admin/applications");
      router.refresh();
    } catch (err) {
      console.error("Failed to approve application:", err);
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Failed to approve application. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
      >
        Approve
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  Approve Application
                </h3>
                <p className="text-sm text-slate-600">
                  {applicationType === "hospital" ? "Hospital" : "Responder"} Application
                </p>
              </div>
            </div>

            <p className="text-slate-600 mb-6">
              Are you sure you want to approve this application? This will grant the user access to the {applicationType} portal.
            </p>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setError("");
                }}
                disabled={loading}
                className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApprove}
                disabled={loading}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Approving...
                  </>
                ) : (
                  "Approve"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
