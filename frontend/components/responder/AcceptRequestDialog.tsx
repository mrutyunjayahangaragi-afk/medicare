"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Check } from "lucide-react";
import type { EmergencyRequest } from "@/types/emergency";
import { EMERGENCY_TYPES } from "@/types/emergency";

interface AcceptRequestDialogProps {
  request: EmergencyRequest;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isAccepting: boolean;
}

export default function AcceptRequestDialog({
  request,
  isOpen,
  onClose,
  onConfirm,
  isAccepting,
}: AcceptRequestDialogProps) {
  const emergencyType = EMERGENCY_TYPES.find((t) => t.id === request.emergency_type);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white rounded-2xl p-6 max-w-md w-full"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Accept Emergency Request?</h3>
              <p className="text-sm text-slate-500">This action requires your commitment</p>
            </div>
          </div>

          {/* Request Summary */}
          <div className="bg-slate-50 rounded-xl p-4 mb-4">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">{emergencyType?.emoji}</span>
              <div>
                <p className="font-medium text-slate-900">{emergencyType?.label}</p>
                <p className="text-sm text-slate-600">{request.severity} severity</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 line-clamp-2">{request.description}</p>
          </div>

          {/* Warning */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800">
                <p className="font-medium mb-1">Important:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>You will become responsible for this request</li>
                  <li>Your availability will be set to "busy"</li>
                  <li>You must update the status as you respond</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isAccepting}
              className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isAccepting}
              className="flex-1 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isAccepting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Accepting...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Accept Request
                </>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
