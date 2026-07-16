"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { MapPin, Clock, Phone, ArrowRight } from "lucide-react";
import { EMERGENCY_TYPES, SEVERITY_LEVELS, STATUS_CONFIG } from "@/types/emergency";
import type { EmergencyRequest } from "@/types/emergency";

interface HistoryCardProps {
  request: EmergencyRequest;
  index: number;
}

export default function HistoryCard({ request, index }: HistoryCardProps) {
  const shouldReduceMotion = useReducedMotion();
  const typeInfo  = EMERGENCY_TYPES.find((t) => t.id === request.emergency_type);
  const sevInfo   = SEVERITY_LEVELS.find((s) => s.id === request.severity);
  const statusCfg = STATUS_CONFIG[request.status];

  const locationText = request.manual_address || null;

  const formattedDate = new Date(request.created_at).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <motion.div
      initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05, ease: "easeOut" }}
      whileHover={shouldReduceMotion ? {} : { y: -2, boxShadow: "0 8px 24px rgba(15,23,42,0.08)" }}
      className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden"
    >
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl flex-shrink-0" aria-hidden="true">{typeInfo?.emoji ?? "❓"}</span>
            <div>
              <p className="text-sm font-black text-slate-900">{typeInfo?.label ?? request.emergency_type}</p>
              {sevInfo && (
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border-2 ${sevInfo.active} inline-flex items-center gap-1 mt-0.5`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${sevInfo.dot}`} aria-hidden="true" />
                  {sevInfo.label}
                </span>
              )}
            </div>
          </div>
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${statusCfg.bg} ${statusCfg.color}`}>
            {statusCfg.label}
          </span>
        </div>

        {/* Location */}
        {(locationText || (request.latitude != null && request.longitude != null)) && (
          <div className="flex items-start gap-1.5 mb-2">
            <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-slate-500 leading-snug line-clamp-2">
              {locationText ?? `${request.latitude?.toFixed(4)}, ${request.longitude?.toFixed(4)}`}
            </p>
          </div>
        )}

        {/* Contact */}
        <div className="flex items-center gap-1.5 mb-2">
          <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          <p className="text-xs text-slate-400">{request.contact_number}</p>
        </div>

        {/* Time */}
        <div className="flex items-center gap-1.5 mb-4">
          <Clock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          <p className="text-xs text-slate-400">{formattedDate}</p>
        </div>

        {/* Link */}
        <Link
          href={`/dashboard/emergency/${request.id}`}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#E53935] hover:underline group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E53935]/40 rounded"
        >
          View Details
          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </motion.div>
  );
}
