"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, X, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { AvailabilityStatus } from "@/types/auth";

interface AvailabilityToggleProps {
  currentStatus: AvailabilityStatus;
  onStatusChange: (status: AvailabilityStatus) => void;
}

const STATUS_CONFIG: Record<
  AvailabilityStatus,
  { label: string; icon: React.ReactNode; color: string; bgColor: string }
> = {
  available: {
    label: "Available",
    icon: <Check className="w-4 h-4" />,
    color: "text-emerald-700",
    bgColor: "bg-emerald-100",
  },
  busy: {
    label: "Busy",
    icon: <Clock className="w-4 h-4" />,
    color: "text-amber-700",
    bgColor: "bg-amber-100",
  },
  offline: {
    label: "Offline",
    icon: <X className="w-4 h-4" />,
    color: "text-slate-700",
    bgColor: "bg-slate-100",
  },
};

export default function AvailabilityToggle({
  currentStatus,
  onStatusChange,
}: AvailabilityToggleProps) {
  const [isUpdating, setIsUpdating] = useState(false);

  const handleStatusChange = async (newStatus: AvailabilityStatus) => {
    if (newStatus === currentStatus || isUpdating) return;

    setIsUpdating(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.rpc("update_responder_availability", {
        new_status: newStatus,
      });

      if (error) throw error;
      onStatusChange(newStatus);
    } catch (error) {
      console.error("Failed to update availability:", error);
      alert("Failed to update availability. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {(Object.keys(STATUS_CONFIG) as AvailabilityStatus[]).map((status) => {
        const config = STATUS_CONFIG[status];
        const isActive = status === currentStatus;

        return (
          <motion.button
            key={status}
            onClick={() => handleStatusChange(status)}
            disabled={isUpdating}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
              isActive
                ? `${config.bgColor} ${config.color} ring-2 ring-offset-2 ring-${config.color.split("-")[1]}-500`
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            aria-label={`Set status to ${config.label}`}
          >
            {config.icon}
            <span className="hidden sm:inline">{config.label}</span>
          </motion.button>
        );
      })}
    </div>
  );
}
