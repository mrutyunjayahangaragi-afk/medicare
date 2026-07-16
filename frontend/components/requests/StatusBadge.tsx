"use client";

import type { EmergencyStatus } from "@/types/database";

interface StatusBadgeProps {
  status: EmergencyStatus;
}

const STATUS_CONFIG: Record<
  EmergencyStatus,
  { label: string; color: string; bg: string }
> = {
  pending:            { label: "Pending",     color: "text-amber-700",  bg: "bg-amber-100"  },
  accepted:           { label: "Accepted",    color: "text-blue-700",   bg: "bg-blue-100"   },
  in_progress:        { label: "In Progress", color: "text-indigo-700", bg: "bg-indigo-100" },
  arrived:            { label: "Arrived",     color: "text-purple-700", bg: "bg-purple-100" },
  volunteer_assigned: { label: "In Progress", color: "text-indigo-700", bg: "bg-indigo-100" },
  hospital_assigned:  { label: "In Progress", color: "text-indigo-700", bg: "bg-indigo-100" },
  completed:          { label: "Completed",   color: "text-green-700",  bg: "bg-green-100"  },
  cancelled:          { label: "Cancelled",   color: "text-gray-700",   bg: "bg-gray-100"   },
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${config.color} ${config.bg}`}
    >
      {config.label}
    </span>
  );
}
