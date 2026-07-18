"use client";

import { motion } from "framer-motion";
import { MapPin, Eye } from "lucide-react";
import StatusBadge from "./StatusBadge";
import type { EmergencyRequest } from "@/types/emergency";
import { EMERGENCY_TYPES, SEVERITY_LEVELS } from "@/types/emergency";

interface RequestsTableProps {
  requests: EmergencyRequest[];
  onViewDetails: (id: string) => void;
}

export default function RequestsTable({ requests, onViewDetails }: RequestsTableProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getLocationDisplay = (request: EmergencyRequest) => {
    if (request.manual_address) {
      return request.manual_address.substring(0, 30) + (request.manual_address.length > 30 ? "..." : "");
    }
    if (request.latitude && request.longitude) {
      return `${Number(request.latitude).toFixed(4)}, ${Number(request.longitude).toFixed(4)}`;
    }
    return "No location";
  };

  const getSeverityBadge = (severity: string) => {
    const config = SEVERITY_LEVELS.find((s) => s.id === severity);
    if (!config) return null;

    const colorMap = {
      low: "bg-green-100 text-green-700",
      medium: "bg-yellow-100 text-yellow-700",
      high: "bg-orange-100 text-orange-700",
      critical: "bg-red-100 text-red-700",
    } as const;

    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold ${colorMap[severity as keyof typeof colorMap]}`}>
        {config.label}
      </span>
    );
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Emergency Type
            </th>
            <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Severity
            </th>
            <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Status
            </th>
            <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Date
            </th>
            <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Location
            </th>
            <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Action
            </th>
          </tr>
        </thead>
        <tbody>
          {requests.map((request, index) => {
            const emergencyType = EMERGENCY_TYPES.find((t) => t.id === request.emergency_type);

            return (
              <motion.tr
                key={request.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
                className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
              >
                <td className="py-4 px-4">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{emergencyType?.emoji}</span>
                    <span className="font-medium text-slate-900">{emergencyType?.label}</span>
                  </div>
                </td>
                <td className="py-4 px-4">{getSeverityBadge(request.severity)}</td>
                <td className="py-4 px-4">
                  <StatusBadge status={request.status} />
                </td>
                <td className="py-4 px-4 text-sm text-slate-600">{formatDate(request.created_at)}</td>
                <td className="py-4 px-4">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <span className="truncate max-w-[200px]">{getLocationDisplay(request)}</span>
                  </div>
                </td>
                <td className="py-4 px-4 text-right">
                  <button
                    onClick={() => onViewDetails(request.id)}
                    className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-colors text-sm font-medium text-slate-700"
                    aria-label={`View details for ${emergencyType?.label}`}
                  >
                    <Eye className="w-4 h-4" />
                    View
                  </button>
                </td>
              </motion.tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
