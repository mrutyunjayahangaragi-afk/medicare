"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Zap, RefreshCw, AlertCircle } from "lucide-react";
import HospitalRecommendationCard from "./HospitalRecommendationCard";
import AmbulanceRecommendationCard from "./AmbulanceRecommendationCard";
import ResponderRecommendationCard from "./ResponderRecommendationCard";
import RecommendationSkeleton from "./RecommendationSkeleton";
import { getRecommendations, type RecommendationResult } from "@/lib/api/client";

interface RecommendationPanelProps {
  requestId: string;
  severity: string;
  latitude: number | null;
  longitude: number | null;
  emergencyType: string;
  /** If true, only show hospital card (responder portal view) */
  compact?: boolean;
}

export default function RecommendationPanel({
  requestId,
  severity,
  latitude,
  longitude,
  emergencyType,
  compact = false,
}: RecommendationPanelProps) {
  const [data, setData]         = useState<RecommendationResult | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  const load = useCallback(async () => {
    // Need coordinates to make a useful recommendation
    if (latitude === null || longitude === null) {
      setLoading(false);
      setData(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await getRecommendations({
        request_id: requestId,
        severity,
        latitude,
        longitude,
        emergency_type: emergencyType,
      });
      if (res.success && res.data) {
        setData(res.data);
      } else {
        setData(null);
      }
    } catch {
      setError("Unable to load recommendations.");
    } finally {
      setLoading(false);
    }
  }, [requestId, severity, latitude, longitude, emergencyType]);

  useEffect(() => {
    load();
  }, [load]);

  if (latitude === null || longitude === null) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      aria-labelledby="rec-heading"
      className="space-y-4"
    >
      {/* Section heading */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-500" aria-hidden="true" />
          <h2 id="rec-heading" className="text-base font-black text-slate-900">
            Emergency Recommendations
          </h2>
        </div>
        {!loading && (
          <button
            type="button"
            onClick={load}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors"
            aria-label="Refresh recommendations"
          >
            <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
            Refresh
          </button>
        )}
      </div>

      {/* Loading */}
      {loading && <RecommendationSkeleton />}

      {/* Error */}
      {!loading && error && (
        <div
          role="alert"
          className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl"
        >
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" aria-hidden="true" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-800">{error}</p>
          </div>
          <button
            type="button"
            onClick={load}
            className="text-xs font-bold text-red-700 underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* No data */}
      {!loading && !error && (!data || !data.recommendation_available) && (
        <div className="flex flex-col items-center justify-center py-8 text-center bg-white border border-slate-100 rounded-2xl">
          <p className="text-sm font-semibold text-slate-600">No suitable emergency service found.</p>
          <p className="text-xs text-slate-400 mt-1">
            Contact emergency services directly.
          </p>
        </div>
      )}

      {/* Results */}
      {!loading && !error && data?.recommendation_available && (
        <>
          <div
            className={
              compact
                ? "space-y-3"
                : "grid grid-cols-1 md:grid-cols-3 gap-4"
            }
          >
            {data.hospital && <HospitalRecommendationCard hospital={data.hospital} />}
            {!compact && data.ambulance && <AmbulanceRecommendationCard ambulance={data.ambulance} />}
            {!compact && data.responder && <ResponderRecommendationCard responder={data.responder} />}
          </div>

          {/* Disclaimer */}
          <p className="text-[10px] text-slate-400 leading-relaxed">{data.disclaimer}</p>
        </>
      )}
    </motion.section>
  );
}
