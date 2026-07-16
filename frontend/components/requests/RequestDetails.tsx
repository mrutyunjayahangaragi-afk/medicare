"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Phone, Calendar, FileText, Download, X, AlertTriangle } from "lucide-react";
import StatusBadge from "./StatusBadge";
import RequestTimeline from "./RequestTimeline";
import type { EmergencyRequest } from "@/types/emergency";
import { EMERGENCY_TYPES, SEVERITY_LEVELS } from "@/types/emergency";
import { cancelEmergencyRequest } from "@/lib/emergency";

interface RequestDetailsProps {
  request: EmergencyRequest;
  onCancel: () => void;
}

export default function RequestDetails({ request, onCancel }: RequestDetailsProps) {
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const emergencyType = EMERGENCY_TYPES.find((t) => t.id === request.emergency_type);
  const severity = SEVERITY_LEVELS.find((s) => s.id === request.severity);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleCancelRequest = async () => {
    setIsCancelling(true);
    try {
      const result = await cancelEmergencyRequest(request.id);
      if (!result.success) {
        throw new Error(result.error || "Cancellation failed");
      }
      onCancel();
    } catch (error) {
      console.error("Failed to cancel request:", error);
      alert("Failed to cancel request. Please try again.");
    } finally {
      setIsCancelling(false);
      setShowCancelDialog(false);
    }
  };

  const handleDownloadSummary = () => {
    // Placeholder for download functionality
    const summary = `
Emergency Request Summary
==========================
Request ID: ${request.id}
Emergency Type: ${emergencyType?.label}
Severity: ${severity?.label}
Status: ${request.status}
Description: ${request.description}
Contact Number: ${request.contact_number}
Location: ${request.manual_address || `${request.latitude?.toFixed(6)}, ${request.longitude?.toFixed(6)}`}
Created: ${formatDate(request.created_at)}
Updated: ${formatDate(request.updated_at)}
    `.trim();

    const blob = new Blob([summary], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `emergency-request-${request.id}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const canCancel = request.status === "pending";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            <span className="text-4xl">{emergencyType?.emoji}</span>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">{emergencyType?.label}</h2>
              <div className="flex items-center gap-3 mt-2">
                <StatusBadge status={request.status} />
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                  severity?.active || "bg-slate-100 text-slate-700"
                }`}>
                  {severity?.label} Severity
                </span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Request ID</p>
            <p className="text-sm font-mono text-slate-700">{request.id.slice(0, 8)}...</p>
          </div>
        </div>

        <p className="text-slate-600 leading-relaxed">{request.description}</p>
      </div>

      {/* Details Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Contact Info */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Contact Information</h3>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Phone className="w-5 h-5 text-slate-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Contact Number</p>
                <p className="font-medium text-slate-900">{request.contact_number}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Location Info */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Location</h3>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-slate-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                  {request.manual_address ? "Manual Address" : "GPS Coordinates"}
                </p>
                <p className="font-medium text-slate-900 break-words">
                  {request.manual_address || 
                    (request.latitude && request.longitude 
                      ? `${request.latitude.toFixed(6)}, ${request.longitude.toFixed(6)}`
                      : "No location data")}
                </p>
                {request.location_accuracy && (
                  <p className="text-xs text-slate-500 mt-1">
                    Accuracy: ±{Math.round(request.location_accuracy)}m
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Timestamps */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Timestamps</h3>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-slate-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Created</p>
                <p className="font-medium text-slate-900">{formatDate(request.created_at)}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-slate-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Last Updated</p>
                <p className="font-medium text-slate-900">{formatDate(request.updated_at)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Evidence */}
        {request.evidence_path && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Evidence</h3>
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-slate-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Evidence File</p>
                <p className="font-medium text-slate-900 break-all">{request.evidence_path}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Timeline */}
      <RequestTimeline currentStatus={request.status} />

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={handleDownloadSummary}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors font-medium text-slate-700"
        >
          <Download className="w-5 h-5" />
          Download Summary
        </button>

        {canCancel && (
          <button
            onClick={() => setShowCancelDialog(true)}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 transition-colors font-medium text-red-700"
          >
            <X className="w-5 h-5" />
            Cancel Request
          </button>
        )}
      </div>

      {/* Cancel Confirmation Dialog */}
      <AnimatePresence>
        {showCancelDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowCancelDialog(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Cancel Request?</h3>
                  <p className="text-sm text-slate-500">This action cannot be undone.</p>
                </div>
              </div>

              <p className="text-slate-600 mb-6">
                Are you sure you want to cancel this emergency request? This will stop any ongoing response efforts.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowCancelDialog(false)}
                  disabled={isCancelling}
                  className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition-colors disabled:opacity-50"
                >
                  Keep Request
                </button>
                <button
                  onClick={handleCancelRequest}
                  disabled={isCancelling}
                  className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCancelling ? "Cancelling..." : "Yes, Cancel"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
