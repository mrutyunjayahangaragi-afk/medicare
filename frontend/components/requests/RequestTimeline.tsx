"use client";

import { motion } from "framer-motion";
import { Check, X, Clock, User, Hospital } from "lucide-react";
import type { EmergencyStatus } from "@/types/database";

interface RequestTimelineProps {
  currentStatus: EmergencyStatus;
}

const TIMELINE_STAGES: Array<{
  status: EmergencyStatus;
  label: string;
  icon: React.ReactNode;
  order: number;
}> = [
  { status: "pending", label: "Submitted", icon: <Clock className="w-4 h-4" />, order: 1 },
  { status: "accepted", label: "Accepted", icon: <User className="w-4 h-4" />, order: 2 },
  { status: "volunteer_assigned", label: "In Progress", icon: <User className="w-4 h-4" />, order: 3 },
  { status: "hospital_assigned", label: "In Progress", icon: <Hospital className="w-4 h-4" />, order: 3 },
  { status: "completed", label: "Completed", icon: <Check className="w-4 h-4" />, order: 4 },
  { status: "cancelled", label: "Cancelled", icon: <X className="w-4 h-4" />, order: 0 },
];

export default function RequestTimeline({ currentStatus }: RequestTimelineProps) {
  const getCurrentStageOrder = () => {
    const stage = TIMELINE_STAGES.find((s) => s.status === currentStatus);
    return stage?.order ?? 1;
  };

  const currentOrder = getCurrentStageOrder();
  const isCancelled = currentStatus === "cancelled";

  const getStageStatus = (stageOrder: number, stageStatus: EmergencyStatus) => {
    if (isCancelled && stageStatus === "cancelled") return "current";
    if (isCancelled) return "skipped";
    if (stageOrder < currentOrder) return "completed";
    if (stageOrder === currentOrder) return "current";
    return "pending";
  };

  const visibleStages = isCancelled
    ? TIMELINE_STAGES.filter((s) => s.status === "pending" || s.status === "cancelled")
    : TIMELINE_STAGES.filter((s) => s.status !== "cancelled" && s.status !== "volunteer_assigned" && s.status !== "hospital_assigned");

  // Add the appropriate "In Progress" stage based on current status
  if (!isCancelled && (currentStatus === "volunteer_assigned" || currentStatus === "hospital_assigned")) {
    const inProgressStage = TIMELINE_STAGES.find((s) => s.status === currentStatus);
    if (inProgressStage && !visibleStages.includes(inProgressStage)) {
      visibleStages.push(inProgressStage);
    }
  }

  visibleStages.sort((a, b) => a.order - b.order);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-6">Request Timeline</h3>

      <div className="relative">
        {/* Timeline Line */}
        <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-slate-200" />

        <div className="space-y-6">
          {visibleStages.map((stage, index) => {
            const stageStatus = getStageStatus(stage.order, stage.status);
            const isLast = index === visibleStages.length - 1;

            const stageConfig = {
              completed: {
                bgColor: "bg-green-500",
                borderColor: "border-green-500",
                textColor: "text-green-700",
                iconBg: "bg-green-500",
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
                key={stage.status}
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
                  {stageStatus === "completed" && (
                    <p className="text-sm text-slate-500 mt-1">Completed successfully</p>
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
