"use client";

import { motion } from "framer-motion";
import { MapPin, Clock, Eye, ChevronRight } from "lucide-react";
import type { EmergencyRequest } from "@/types/emergency";
import { EMERGENCY_TYPES, SEVERITY_LEVELS } from "@/types/emergency";
import StatusBadge from "@/components/requests/StatusBadge";

interface AssignedRequestCardProps {
  request: EmergencyRequest;
  onViewDetails: (id: string) => void;
}

export default function AssignedRequestCard({
  request,
  onViewDetails,
}: AssignedRequestCardProps) {
  const emergencyType = EMERGENCY_TYPES.find((t) => t.id === request.emergency_type);
  const severity = SEVERITY_LEVELS.find((s) => s.id === request.severity);

  const getAssignedTime = (assignedAt: string | null) => {
    if (!assignedAt) return "Not assigned";
    const now = new Date();
    const assigned = new Date(assignedAt);
    const diffMs = now.getTime() - assigned.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return "Just assigned";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  const getLocationDisplay = () => {
    if (request.manual_address) {
      return request.manual_address.substring(0, 35) + (request.manual_address.length > 35 ? "..." : "");
    }
    if (request.latitude && request.longitude) {
      return `${request.latitude.toFixed(4)}, ${request.longitude.toFixed(4)}`;
    }
    return "No location";
  };

  const severityColors = {
    low: "bg-green-100 text-green-700 border-green-200",
    medium: "bg-yellow-100 text-yellow-700 border-yellow-200",
    high: "bg-orange-100 text-orange-700 border-orange-200",
    critical: "bg-red-100 text-red-700 border-red-200",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`bg-white border rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow ${
        request.severity === "critical" ? "border-red-300" : "border-slate-200"
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{emergencyType?.emoji}</span>
          <div>
            <h3 className="font-semibold text-slate-900">{emergencyType?.label}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border ${severityColors[request.severity]}`}>
                {severity?.label}
              </span>
              <StatusBadge status={request.status} />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Clock className="w-3.5 h-3.5" />
          {getAssignedTime(request.assigned_at)}
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-slate-600 mb-4 line-clamp-2">{request.description}</p>

      {/* Location */}
      <div className="flex items-center gap-2 text-xs text-slate-500 mb-4">
        <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
        <span className="line-clamp-1">{getLocationDisplay()}</span>
      </div>

      {/* Action */}
      <button
        onClick={() => onViewDetails(request.id)}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition-colors"
      >
        View Details
        <ChevronRight className="w-4 h-4" />
      </button>
    </motion.div>
  );
}
