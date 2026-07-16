"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, CheckCircle, X, AlertTriangle } from "lucide-react";
import type { EmergencyStatus } from "@/types/database";

interface StatusActionPanelProps {
  currentStatus: EmergencyStatus;
  onStartResponse: () => void;
  onCompleteResponse: () => void;
  onCancelResponse: () => void;
  isUpdating: boolean;
}

export default function StatusActionPanel({
  currentStatus,
  onStartResponse,
  onCompleteResponse,
  onCancelResponse,
  isUpdating,
}: StatusActionPanelProps) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<"start" | "complete" | "cancel" | null>(null);

  const handleAction = (action: "start" | "complete" | "cancel") => {
    if (action === "start") {
      onStartResponse();
    } else if (action === "complete") {
      setShowConfirmDialog(true);
      setPendingAction("complete");
    } else if (action === "cancel") {
      setShowConfirmDialog(true);
      setPendingAction("cancel");
    }
  };

  const handleConfirm = () => {
    if (pendingAction === "complete") {
      onCompleteResponse();
    } else if (pendingAction === "cancel") {
      onCancelResponse();
    }
    setShowConfirmDialog(false);
    setPendingAction(null);
  };

  const getActionButtons = () => {
    if (currentStatus === "accepted") {
      return (
        <button
          onClick={() => handleAction("start")}
          disabled={isUpdating}
          className="flex items-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Play className="w-5 h-5" />
          Start Response
        </button>
      );
    }

    if (currentStatus === "volunteer_assigned" || currentStatus === "hospital_assigned") {
      return (
        <button
          onClick={() => handleAction("complete")}
          disabled={isUpdating}
          className="flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <CheckCircle className="w-5 h-5" />
          Mark as Completed
        </button>
      );
    }

    return null;
  };

  const getCancelButton = () => {
    if (currentStatus === "accepted" || currentStatus === "volunteer_assigned" || currentStatus === "hospital_assigned") {
      return (
        <button
          onClick={() => handleAction("cancel")}
          disabled={isUpdating}
          className="flex items-center gap-2 px-6 py-3 bg-red-50 border border-red-200 hover:bg-red-100 text-red-700 font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <X className="w-5 h-5" />
          Cancel Request
        </button>
      );
    }
    return null;
  };

  const actionButtons = getActionButtons();
  const cancelButton = getCancelButton();

  if (!actionButtons && !cancelButton) {
    return null;
  }

  return (
    <>
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Response Actions</h3>
        <div className="flex flex-col sm:flex-row gap-3">
          {actionButtons}
          {cancelButton}
        </div>
      </div>

      {/* Confirmation Dialog */}
      <AnimatePresence>
        {showConfirmDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowConfirmDialog(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  pendingAction === "complete" ? "bg-emerald-100" : "bg-red-100"
                }`}>
                  {pendingAction === "complete" ? (
                    <CheckCircle className="w-6 h-6 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    {pendingAction === "complete" ? "Complete Response?" : "Cancel Request?"}
                  </h3>
                  <p className="text-sm text-slate-500">This action cannot be undone</p>
                </div>
              </div>

              <p className="text-slate-600 mb-6">
                {pendingAction === "complete"
                  ? "Are you sure you want to mark this emergency request as completed? This will close the request."
                  : "Are you sure you want to cancel this emergency request? This will release your assignment."}
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmDialog(false)}
                  disabled={isUpdating}
                  className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition-colors disabled:opacity-50"
                >
                  Go Back
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={isUpdating}
                  className={`flex-1 px-4 py-2.5 font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    pendingAction === "complete"
                      ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                      : "bg-red-500 hover:bg-red-600 text-white"
                  }`}
                >
                  {isUpdating ? "Updating..." : "Confirm"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
