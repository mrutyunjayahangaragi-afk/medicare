"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, MapPin, Phone, Calendar, FileText, AlertCircle } from "lucide-react";
import ResponderRequestTimeline from "@/components/responder/ResponderRequestTimeline";
import StatusActionPanel from "@/components/responder/StatusActionPanel";
import RecommendationPanel from "@/components/recommendation/RecommendationPanel";
import { createClient } from "@/lib/supabase/client";
import type { EmergencyRequest } from "@/types/emergency";
import { EMERGENCY_TYPES, SEVERITY_LEVELS } from "@/types/emergency";

export default function ResponderRequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  // Next.js 16: params is a Promise — unwrap it with React.use()
  const { id } = use(params);

  const router = useRouter();
  const [request, setRequest] = useState<EmergencyRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const loadRequest = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data, error: fetchError } = await supabase
        .from("emergency_requests")
        .select("*")
        .eq("id", id)
        .single();

      if (fetchError) throw fetchError;

      // Check if request is accessible (unassigned pending or assigned to current user)
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const isAccessible =
        (data.status === "pending" && !data.assigned_responder_id) ||
        data.assigned_responder_id === user.id;

      if (!isAccessible) {
        setError("You don't have permission to view this request");
        return;
      }

      setRequest(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : JSON.stringify(err);
      console.error("Failed to load request:", msg);
      setError("Failed to load request details");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRequest();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleStartResponse = async () => {
    setIsUpdating(true);
    try {
      const supabase = createClient();
      const { error: rpcError } = await supabase.rpc("update_emergency_request_status", {
        request_id: id,
        next_status: "in_progress",
      });
      if (rpcError) throw rpcError;
      await loadRequest();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : JSON.stringify(err);
      console.error("Failed to start response:", msg);
      alert("Failed to update request status. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCompleteResponse = async () => {
    setIsUpdating(true);
    try {
      const supabase = createClient();
      const { error: rpcError } = await supabase.rpc("update_emergency_request_status", {
        request_id: id,
        next_status: "completed",
      });
      if (rpcError) throw rpcError;
      await loadRequest();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : JSON.stringify(err);
      console.error("Failed to complete response:", msg);
      alert("Failed to update request status. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancelResponse = async () => {
    setIsUpdating(true);
    try {
      const supabase = createClient();
      const { error: rpcError } = await supabase.rpc("update_emergency_request_status", {
        request_id: id,
        next_status: "cancelled",
      });
      if (rpcError) throw rpcError;
      await loadRequest();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : JSON.stringify(err);
      console.error("Failed to cancel response:", msg);
      alert("Failed to cancel request. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-12 bg-slate-200 rounded-xl" />
            <div className="h-48 bg-slate-200 rounded-xl" />
            <div className="grid md:grid-cols-2 gap-6">
              <div className="h-48 bg-slate-200 rounded-xl" />
              <div className="h-48 bg-slate-200 rounded-xl" />
            </div>
            <div className="h-64 bg-slate-200 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center justify-center py-16"
          >
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
              <AlertCircle className="w-10 h-10 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">
              {error || "Request Not Found"}
            </h2>
            <p className="text-slate-500 text-center max-w-md mb-8">
              The emergency request you're looking for doesn't exist or you don't have permission to view it.
            </p>
            <button
              onClick={() => router.push("/responder/requests")}
              className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl transition-colors"
            >
              Back to Requests
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  const emergencyType = EMERGENCY_TYPES.find((t) => t.id === request.emergency_type);
  const severity = SEVERITY_LEVELS.find((s) => s.id === request.severity);

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center gap-3 mb-8"
        >
          <button
            onClick={() => router.push("/responder/requests")}
            className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
            aria-label="Go back to requests"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Request Details</h1>
        </motion.div>

        {/* Request Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="bg-white border border-slate-200 rounded-2xl p-6 mb-6"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-4">
              <span className="text-4xl">{emergencyType?.emoji}</span>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">{emergencyType?.label}</h2>
                <div className="flex items-center gap-3 mt-2">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${
                    severity?.active || "bg-slate-100 text-slate-700"
                  }`}>
                    {severity?.label} Severity
                  </span>
                  <span className="text-sm text-slate-600">Status: {request.status}</span>
                </div>
              </div>
            </div>
          </div>

          <p className="text-slate-600 leading-relaxed mb-4">{request.description}</p>

          <div className="text-xs text-slate-500 font-mono">
            Request ID: {request.id}
          </div>
        </motion.div>

        {/* Recommendation — hospital + ETA for responder */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
          className="mb-6"
        >
          <RecommendationPanel
            requestId={request.id}
            severity={request.severity}
            latitude={request.latitude}
            longitude={request.longitude}
            emergencyType={request.emergency_type}
            compact={true}
          />
        </motion.div>

        {/* Details Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="grid md:grid-cols-2 gap-6 mb-6"
        >
          {/* Contact Info */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Contact Information</h3>
            <div className="space-y-4">
              <div className="flex items_start gap-3">
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
        </motion.div>

        {/* Timeline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          className="mb-6"
        >
          <ResponderRequestTimeline
            currentStatus={request.status}
            timestamps={{
              created_at: request.created_at,
              accepted_at: request.accepted_at,
              in_progress_at: request.in_progress_at,
              completed_at: request.completed_at,
              cancelled_at: request.cancelled_at,
            }}
          />
        </motion.div>

        {/* Status Actions */}
        {request.assigned_responder_id && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.4 }}
          >
            <StatusActionPanel
              currentStatus={request.status}
              onStartResponse={handleStartResponse}
              onCompleteResponse={handleCompleteResponse}
              onCancelResponse={handleCancelResponse}
              isUpdating={isUpdating}
            />
          </motion.div>
        )}
      </div>
    </div>
  );
}
