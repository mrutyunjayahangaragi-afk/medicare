"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, AlertCircle } from "lucide-react";
import RequestDetails from "@/components/requests/RequestDetails";
import RecommendationPanel from "@/components/recommendation/RecommendationPanel";
import { fetchEmergencyById } from "@/lib/emergency";
import type { EmergencyRequest } from "@/types/emergency";

export default function RequestDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [request, setRequest] = useState<EmergencyRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRequest = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchEmergencyById(params.id);
      if (!data) {
        setError("Request not found");
        return;
      }
      setRequest(data);
    } catch (err) {
      console.error("Failed to load request:", err);
      setError("Failed to load request details");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRequest();
  }, [params.id]);

  const handleCancel = () => {
    // Reload the request to get updated status
    loadRequest();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Request Details</h1>
          </div>
          <div className="animate-pulse space-y-6">
            <div className="h-32 bg-slate-200 rounded-2xl" />
            <div className="grid md:grid-cols-2 gap-6">
              <div className="h-48 bg-slate-200 rounded-2xl" />
              <div className="h-48 bg-slate-200 rounded-2xl" />
            </div>
            <div className="h-64 bg-slate-200 rounded-2xl" />
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
              onClick={() => router.push("/dashboard/requests")}
              className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl transition-colors"
            >
              Back to My Requests
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

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
            onClick={() => router.push("/dashboard/requests")}
            className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
            aria-label="Go back to requests"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Request Details</h1>
        </motion.div>

        {/* Request Details */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <RequestDetails request={request} onCancel={handleCancel} />
        </motion.div>

        {/* Recommendations — shown below the status card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="mt-6"
        >
          <RecommendationPanel
            requestId={request.id}
            severity={request.severity}
            latitude={request.latitude}
            longitude={request.longitude}
            emergencyType={request.emergency_type}
          />
        </motion.div>
      </div>
    </div>
  );
}
