"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { XCircle, Loader2 } from "lucide-react";
import { rejectAdminApplication } from "@/lib/api/client";
import { ApiError } from "@/lib/api/client";

interface RejectApplicationDialogProps {
  applicationId: string;
}

export default function RejectApplicationDialog({
  applicationId,
}: RejectApplicationDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleReject = async () => {
    if (reason.length < 10 || reason.length > 500) {
      setError("Rejection reason must be between 10 and 500 characters");
      return;
    }

    setLoading(true);
    setError("");
    try {
      await rejectAdminApplication(applicationId, reason);
      setIsOpen(false);
      setReason("");
      router.push("/admin/applications");
      router.refresh();
    } catch (err) {
      console.error("Failed to reject application:", err);
      if (err instanceof ApiError) {
        // Surface the real backend error — never hide it
        setError(`Rejection failed (${err.status}): ${err.message}`);
      } else if (err instanceof Error) {
        setError(`Rejection failed: ${err.message}`);
      } else {
        setError("Failed to reject application. Please try again.");
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
        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
      >
        Reject
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  Reject Application
                </h3>
                <p className="text-sm text-slate-600">
                  This action cannot be undone
                </p>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Rejection Reason
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Please provide a reason for rejection (10-500 characters)"
                rows={4}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                disabled={loading}
              />
              {error && (
                <p className="text-sm text-red-600 mt-1">{error}</p>
              )}
              <p className="text-xs text-slate-500 mt-1">
                {reason.length}/500 characters
              </p>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setReason("");
                  setError("");
                }}
                disabled={loading}
                className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReject}
                disabled={loading || reason.length < 10}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Rejecting...
                  </>
                ) : (
                  "Reject Application"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
