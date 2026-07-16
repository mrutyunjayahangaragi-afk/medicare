"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, RefreshCw, AlertCircle } from "lucide-react";
import FilterBar from "@/components/requests/FilterBar";
import RequestCard from "@/components/requests/RequestCard";
import RequestsTable from "@/components/requests/RequestsTable";
import EmptyState from "@/components/requests/EmptyState";
import { fetchMyEmergencyRequests } from "@/lib/emergency";
import type { EmergencyRequest } from "@/types/emergency";

export default function RequestsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<EmergencyRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<EmergencyRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const loadRequests = useCallback(async () => {
    setFetchError(null);
    try {
      const data = await fetchMyEmergencyRequests();
      setRequests(data);
    } catch (error) {
      console.error("[requests] load failed:", error);
      setFetchError("Unable to load your emergency requests. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  // Apply filters whenever source data or filter state changes
  useEffect(() => {
    let filtered = [...requests];

    if (statusFilter !== "all") {
      if (statusFilter === "assigned") {
        filtered = filtered.filter(
          (r) => r.status === "volunteer_assigned" || r.status === "hospital_assigned"
        );
      } else {
        filtered = filtered.filter((r) => r.status === statusFilter);
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((r) =>
        r.emergency_type.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        (r.manual_address ?? "").toLowerCase().includes(q) ||
        r.contact_number.toLowerCase().includes(q)
      );
    }

    setFilteredRequests(filtered);
  }, [searchQuery, statusFilter, requests]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setIsLoading(true);
    await loadRequests();
    setIsRefreshing(false);
  };

  const handleViewDetails = (id: string) => {
    router.push(`/dashboard/requests/${id}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">My Requests</h1>
          </div>
          <div className="animate-pulse space-y-4">
            <div className="h-12 bg-slate-200 rounded-xl" />
            <div className="h-64 bg-slate-200 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center justify-between gap-3 mb-8"
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">My Requests</h1>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50"
            aria-label="Refresh requests"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </motion.div>

        {/* Fetch error state */}
        {fetchError && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl"
            role="alert"
          >
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-800">{fetchError}</p>
              <button
                onClick={handleRefresh}
                className="mt-1 text-xs font-medium text-red-700 underline hover:no-underline"
              >
                Try again
              </button>
            </div>
          </motion.div>
        )}

        {/* Filter Bar */}
        <FilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
        />

        {/* Content */}
        {!fetchError && filteredRequests.length === 0 && requests.length === 0 ? (
          /* Genuinely empty — no requests at all */
          <EmptyState />
        ) : !fetchError && filteredRequests.length === 0 ? (
          /* Filtered to zero — filters are just too narrow */
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-slate-500 font-medium mb-2">No requests match your filters.</p>
            <button
              onClick={() => { setSearchQuery(""); setStatusFilter("all"); }}
              className="text-sm text-blue-600 hover:text-blue-700 font-semibold"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <>
            {/* Desktop: Table */}
            <div className="hidden lg:block bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <RequestsTable requests={filteredRequests} onViewDetails={handleViewDetails} />
            </div>

            {/* Mobile: Cards */}
            <div className="lg:hidden grid gap-4">
              {filteredRequests.map((request) => (
                <RequestCard
                  key={request.id}
                  request={request}
                  onViewDetails={handleViewDetails}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
