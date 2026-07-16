"use client";

import { motion } from "framer-motion";
import { MapPin, Clock, AlertTriangle, Eye } from "lucide-react";
import type { EmergencyRequest } from "@/types/emergency";
import { EMERGENCY_TYPES, SEVERITY_LEVELS } from "@/types/emergency";

interface AvailableRequestCardProps {
  request: EmergencyRequest;
  onViewDetails: (id: string) => void;
  onAccept: (id: string) => void;
  isAccepting?: boolean;
}

export default function AvailableRequestCard({
  request,
  onViewDetails,
  onAccept,
  isAccepting = false,
}: AvailableRequestCardProps) {
  const emergencyType = EMERGENCY_TYPES.find((t) => t.id === request.emergency_type);
  const severity = SEVERITY_LEVELS.find((s) => s.id === request.severity);

  const getRequestAge = (createdAt: string) => {
    const now = new Date();
    const created = new Date(createdAt);
    const diffMs = now.getTime() - created.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  const getLocationDisplay = () => {
    if (request.manual_address) {
      return request.manual_address.substring(0, 40) + (request.manual_address.length > 40 ? "..." : "");
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
              {request.severity === "critical" && (
                <span className="flex items-center gap-1 text-xs text-red-600 font-medium">
                  <AlertTriangle className="w-3 h-3" />
                  Critical
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Clock className="w-3.5 h-3.5" />
          {getRequestAge(request.created_at)}
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-slate-600 mb-4 line-clamp-2">{request.description}</p>

      {/* Location */}
      <div className="flex items-center gap-2 text-xs text-slate-500 mb-4">
        <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
        <span className="line-clamp-1">{getLocationDisplay()}</span>
      </div>

      {/* Evidence indicator */}
      {request.evidence_path && (
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-4">
          <span className="inline-flex items-center px-2 py-0.5 bg-slate-100 rounded-md">
            📎 Evidence attached
          </span>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={() => onViewDetails(request.id)}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition-colors"
        >
          <Eye className="w-4 h-4" />
          View
        </button>
        <button
          onClick={() => onAccept(request.id)}
          disabled={isAccepting}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isAccepting ? "Accepting..." : "Accept"}
        </button>
      </div>
    </motion.div>
  );
}
