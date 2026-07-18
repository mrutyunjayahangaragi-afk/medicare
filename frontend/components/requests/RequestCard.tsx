"use client";

import { motion } from "framer-motion";
import { MapPin, Clock, ArrowRight } from "lucide-react";
import StatusBadge from "./StatusBadge";
import type { EmergencyRequest } from "@/types/emergency";
import { EMERGENCY_TYPES, SEVERITY_LEVELS } from "@/types/emergency";

interface RequestCardProps {
  request: EmergencyRequest;
  onViewDetails: (id: string) => void;
}

export default function RequestCard({ request, onViewDetails }: RequestCardProps) {
  const emergencyType = EMERGENCY_TYPES.find((t) => t.id === request.emergency_type);
  const severity = SEVERITY_LEVELS.find((s) => s.id === request.severity);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getLocationDisplay = () => {
    if (request.manual_address) {
      return request.manual_address;
    }
    if (request.latitude && request.longitude) {
      return `${Number(request.latitude).toFixed(4)}, ${Number(request.longitude).toFixed(4)}`;
    }
    return "No location";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{emergencyType?.emoji}</span>
          <div>
            <h3 className="font-semibold text-slate-900">{emergencyType?.label}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className={`w-2 h-2 rounded-full ${severity?.dot}`} />
              <span className="text-xs font-medium text-slate-600">{severity?.label}</span>
            </div>
          </div>
        </div>
        <StatusBadge status={request.status} />
      </div>

      {/* Description */}
      <p className="text-sm text-slate-600 mb-4 line-clamp-2">{request.description}</p>

      {/* Location */}
      <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
        <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
        <span className="line-clamp-1">{getLocationDisplay()}</span>
      </div>

      {/* Time */}
      <div className="flex items-center gap-2 text-xs text-slate-500 mb-4">
        <Clock className="w-3.5 h-3.5 flex-shrink-0" />
        <span>{formatDate(request.created_at)}</span>
      </div>

      {/* Action Button */}
      <button
        onClick={() => onViewDetails(request.id)}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition-colors"
      >
        View Details
        <ArrowRight className="w-4 h-4" />
      </button>
    </motion.div>
  );
}
