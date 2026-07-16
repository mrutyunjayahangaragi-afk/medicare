"use client";

import { motion } from "framer-motion";
import { Check, X, Clock, User, Activity } from "lucide-react";
import type { EmergencyStatus } from "@/types/database";

interface ResponderRequestTimelineProps {
  currentStatus: EmergencyStatus;
  timestamps: {
    created_at: string;
    accepted_at: string | null;
    in_progress_at: string | null;
    completed_at: string | null;
    cancelled_at: string | null;
  };
}

type TimestampKey = "created_at" | "accepted_at" | "in_progress_at" | "completed_at" | "cancelled_at";

const TIMELINE_STAGES: Array<{
  key: TimestampKey;
  label: string;
  icon: React.ReactNode;
  order: number;
}> = [
  { key: "created_at", label: "Request Submitted", icon: <Clock className="w-4 h-4" />, order: 1 },
  { key: "accepted_at", label: "Request Accepted", icon: <User className="w-4 h-4" />, order: 2 },
  { key: "in_progress_at", label: "Response Started", icon: <Activity className="w-4 h-4" />, order: 3 },
  { key: "completed_at", label: "Request Completed", icon: <Check className="w-4 h-4" />, order: 4 },
  { key: "cancelled_at", label: "Request Cancelled", icon: <X className="w-4 h-4" />, order: 0 },
];

export default function ResponderRequestTimeline({
  currentStatus,
  timestamps,
}: ResponderRequestTimelineProps) {
  const getCurrentStageOrder = () => {
    if (currentStatus === "cancelled") return 0;
    if (currentStatus === "completed") return 4;
    if (currentStatus === "volunteer_assigned" || currentStatus === "hospital_assigned") return 3;
    if (currentStatus === "accepted") return 2;
    if (currentStatus === "pending") return 1;
    return 1;
  };

  const currentOrder = getCurrentStageOrder();
  const isCancelled = currentStatus === "cancelled";

  const getStageStatus = (stageOrder: number, stageKey: TimestampKey) => {
    if (isCancelled && stageKey === "cancelled_at") return "current";
    if (isCancelled) return "skipped";
    
    const timestamp = timestamps[stageKey];
    if (timestamp) return "completed";
    if (stageOrder < currentOrder) return "completed";
    if (stageOrder === currentOrder) return "current";
    return "pending";
  };

  const formatTimestamp = (timestamp: string | null) => {
    if (!timestamp) return null;
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const visibleStages = isCancelled
    ? TIMELINE_STAGES.filter((s) => s.key === "created_at" || s.key === "cancelled_at")
    : TIMELINE_STAGES.filter((s) => s.key !== "cancelled_at");

  visibleStages.sort((a, b) => a.order - b.order);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-6">Request Timeline</h3>

      <div className="relative">
        {/* Timeline Line */}
        <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-slate-200" />

        <div className="space-y-6">
          {visibleStages.map((stage, index) => {
            const stageStatus = getStageStatus(stage.order, stage.key);
            const isLast = index === visibleStages.length - 1;
            const timestamp = formatTimestamp(timestamps[stage.key as TimestampKey]);

            const stageConfig = {
              completed: {
                bgColor: "bg-emerald-500",
                borderColor: "border-emerald-500",
                textColor: "text-emerald-700",
                iconBg: "bg-emerald-500",
              },
              current: {
                bgColor: "bg-blue-500",
                borderColor: "border-blue-500",
                textColor: "text-blue-700",
                iconBg: "bg-blue-500",
              },
              pending: {
                bgColor: "bg-slate-200",
                borderColor: "border-slate-200",
                textColor: "text-slate-400",
                iconBg: "bg-slate-200",
              },
              skipped: {
                bgColor: "bg-slate-200",
                borderColor: "border-slate-200",
                textColor: "text-slate-400",
                iconBg: "bg-slate-200",
              },
            };

            const config = stageConfig[stageStatus];

            return (
              <motion.div
                key={stage.key}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className="relative flex items-start gap-4"
              >
                {/* Icon */}
                <div
                  className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center ${config.iconBg} ${
                    stageStatus === "current" ? "ring-4 ring-blue-100" : ""
                  }`}
                >
                  <span className="text-white">{stage.icon}</span>
                </div>

                {/* Content */}
                <div className={`flex-1 pb-4 ${isLast ? "" : "border-b border-slate-100"}`}>
                  <div className="flex items-center gap-2">
                    <span className={`font-medium ${config.textColor}`}>{stage.label}</span>
                    {stageStatus === "current" && (
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                        Current
                      </span>
                    )}
                  </div>
                  {timestamp && (
                    <p className="text-sm text-slate-500 mt-1">{timestamp}</p>
                  )}
                  {stageStatus === "completed" && !timestamp && (
                    <p className="text-sm text-slate-500 mt-1">Completed</p>
                  )}
                  {stageStatus === "current" && (
                    <p className="text-sm text-slate-500 mt-1">In progress</p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
