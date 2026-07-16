"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Filter } from "lucide-react";
import AvailableRequestCard from "@/components/responder/AvailableRequestCard";
import AssignedRequestCard from "@/components/responder/AssignedRequestCard";
import ResponderRealtimeSync from "@/components/responder/ResponderRealtimeSync";
import ResponderEmptyState from "@/components/responder/ResponderEmptyState";
import { createClient } from "@/lib/supabase/client";
import type { EmergencyRequest } from "@/types/emergency";

type ViewState = "available" | "assigned" | "active" | "completed";

export default function ResponderRequestsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const viewParam = searchParams.get("view") as ViewState || "available";
  
  const [view, setView] = useState<ViewState>(viewParam);
  const [requests, setRequests] = useState<EmergencyRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState<string | null>(null);

  const loadRequests = async () => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      let query = supabase.from("emergency_requests").select("*");

      switch (view) {
        case "available":
          query = query
            .eq("status", "pending")
            .is("assigned_responder_id", null)
            .order("severity", { ascending: false })
            .order("created_at", { ascending: true });
          break;
        case "assigned":
          query = query
            .in("status", ["accepted", "volunteer_assigned", "hospital_assigned"])
            .order("created_at", { ascending: false });
          break;
        case "active":
          query = query
            .in("status", ["volunteer_assigned", "hospital_assigned"])
            .order("created_at", { ascending: false });
          break;
        case "completed":
          query = query
            .eq("status", "completed")
            .order("completed_at", { ascending: false });
          break;
      }

      const { data } = await query;
      setRequests(data || []);
    } catch (error) {
      console.error("Failed to load requests:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setView(viewParam);
  }, [viewParam]);

  useEffect(() => {
    loadRequests();
  }, [view]);

  const handleViewChange = (newView: ViewState) => {
    router.push(`/responder/requests?view=${newView}`);
  };

  const handleAcceptRequest = async (requestId: string) => {
    setIsAccepting(requestId);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("accept_emergency_request", {
        request_id: requestId,
      });

      if (error) throw error;

      // Update availability to busy
      await supabase.rpc("update_responder_availability", {
        new_status: "busy",
      });

      // Reload requests
      await loadRequests();
    } catch (error) {
      console.error("Failed to accept request:", error);
      alert("Failed to accept request. It may have been assigned to another responder.");
    } finally {
      setIsAccepting(null);
    }
  };

  const handleViewDetails = (requestId: string) => {
    router.push(`/responder/requests/${requestId}`);
  };

  const VIEW_CONFIG: Record<
    ViewState,
    { label: string; emptyType: "available" | "assigned" | "active" | "completed" }
  > = {
    available: { label: "Available Requests", emptyType: "available" },
    assigned: { label: "My Assignments", emptyType: "assigned" },
    active: { label: "Active Responses", emptyType: "active" },
    completed: { label: "Completed Requests", emptyType: "completed" },
  };

  const currentConfig = VIEW_CONFIG[view];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-12 bg-slate-200 rounded-xl" />
            <div className="h-8 bg-slate-200 rounded-xl w-1/3" />
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-48 bg-slate-200 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <ResponderRealtimeSync
        onRequestUpdate={() => loadRequests()}
        onRequestRemoved={(id) => {
          setRequests((prev) => prev.filter((r) => r.id !== id));
          loadRequests();
        }}
      />

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center gap-3 mb-8"
        >
          <button
            onClick={() => router.push("/responder")}
            className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
            aria-label="Go back to dashboard"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            {currentConfig.label}
          </h1>
        </motion.div>

        {/* View Filter */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="flex items-center gap-3 mb-6 overflow-x-auto pb-2"
        >
          <div className="flex items-center gap-2 text-slate-500">
            <Filter className="w-4 h-4" />
            <span className="text-sm font-medium">View:</span>
          </div>
          {(Object.keys(VIEW_CONFIG) as ViewState[]).map((viewKey) => (
            <button
              key={viewKey}
              onClick={() => handleViewChange(viewKey)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                view === viewKey
                  ? "bg-blue-500 text-white"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {VIEW_CONFIG[viewKey].label}
            </button>
          ))}
        </motion.div>

        {/* Requests Grid */}
        {requests.length === 0 ? (
          <ResponderEmptyState type={currentConfig.emptyType} />
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {requests.map((request) =>
              view === "available" ? (
                <AvailableRequestCard
                  key={request.id}
                  request={request}
                  onViewDetails={handleViewDetails}
                  onAccept={handleAcceptRequest}
                  isAccepting={isAccepting === request.id}
                />
              ) : (
                <AssignedRequestCard
                  key={request.id}
                  request={request}
                  onViewDetails={handleViewDetails}
                />
              )
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
