"use client";

import { motion } from "framer-motion";
import { CheckCircle, Clock, Navigation, MapPin, Flag } from "lucide-react";

interface StatusTimelineProps {
  currentStatus: string;
  timestamps: {
    accepted_at?: string | null;
    in_progress_at?: string | null;
    completed_at?: string | null;
  };
}

interface TimelineStage {
  key: string;
  label: string;
  icon: React.ReactNode;
  order: number;
}

const TIMELINE_STAGES: TimelineStage[] = [
  { key: "accepted_at", label: "Request Accepted", icon: <CheckCircle className="w-4 h-4" />, order: 1 },
  { key: "in_progress_at", label: "Responder On The Way", icon: <Navigation className="w-4 h-4" />, order: 2 },
  { key: "completed_at", label: "Arrived & Completed", icon: <Flag className="w-4 h-4" />, order: 3 },
];

export default function StatusTimeline({
  currentStatus,
  timestamps,
}: StatusTimelineProps) {
  const getCurrentStageOrder = () => {
    if (currentStatus === "completed") return 3;
    if (currentStatus === "volunteer_assigned" || currentStatus === "hospital_assigned") return 2;
    if (currentStatus === "accepted") return 1;
    return 0;
  };

  const currentOrder = getCurrentStageOrder();

  const getStageStatus = (stageOrder: number, stageKey: keyof typeof timestamps) => {
    const timestamp = timestamps[stageKey];
    if (timestamp) return "completed";
    if (stageOrder < currentOrder) return "completed";
    if (stageOrder === currentOrder) return "current";
    return "pending";
  };

  const formatTimestamp = (timestamp: string | null | undefined) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-6">Response Timeline</h3>

      <div className="relative">
        {/* Timeline Line */}
        <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-slate-200" />

        <div className="space-y-6">
          {TIMELINE_STAGES.map((stage, index) => {
            const stageStatus = getStageStatus(stage.order, stage.key as keyof typeof timestamps);
            const timestamp = formatTimestamp(timestamps[stage.key as keyof typeof timestamps]);
            const isLast = index === TIMELINE_STAGES.length - 1;

            const stageConfig = {
              completed: {
                bgColor: "bg-emerald-500",
                borderColor: "border-emerald-500",
                textColor: "text-emerald-700",
                iconBg: "bg-emerald-500",
                lineColor: "bg-emerald-500",
              },
              current: {
                bgColor: "bg-blue-500",
                borderColor: "border-blue-500",
                textColor: "text-blue-700",
                iconBg: "bg-blue-500",
                lineColor: "bg-blue-500",
              },
              pending: {
                bgColor: "bg-slate-200",
                borderColor: "border-slate-200",
                textColor: "text-slate-400",
                iconBg: "bg-slate-200",
                lineColor: "bg-slate-200",
              },
            };

            const config = stageConfig[stageStatus];

            return (
              <div key={stage.key} className="relative flex items-start gap-4">
                {/* Timeline Dot */}
                <div className={`relative z-10 w-8 h-8 rounded-full ${config.iconBg} flex items-center justify-center border-4 ${config.borderColor} bg-white`}>
                  <span className={config.textColor}>{stage.icon}</span>
                </div>

                {/* Timeline Content */}
                <div className={`flex-1 pb-6 ${isLast ? "" : "border-l-2 ${config.lineColor}"}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`font-medium ${config.textColor}`}>{stage.label}</p>
                      {timestamp && (
                        <p className="text-sm text-slate-500 mt-1">{timestamp}</p>
                      )}
                    </div>
                    {stageStatus === "current" && (
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        className="w-2 h-2 bg-blue-500 rounded-full"
                      />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
