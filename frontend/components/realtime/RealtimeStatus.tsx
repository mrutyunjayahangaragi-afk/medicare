/**
 * components/realtime/RealtimeStatus.tsx
 * Small indicator badge showing current connection state.
 */

"use client";

import React from "react";
import type { RealtimeConnectionState } from "@/lib/realtime/types";
import { connectionStatusLabel } from "@/lib/realtime/connection-state";

interface RealtimeStatusProps {
  state: RealtimeConnectionState;
  showLabel?: boolean;
}

export default function RealtimeStatus({ state, showLabel = true }: RealtimeStatusProps) {
  const statusColors: Record<RealtimeConnectionState, string> = {
    idle: "bg-slate-400",
    connecting: "bg-amber-400 animate-pulse",
    connected: "bg-emerald-500",
    reconnecting: "bg-amber-500 animate-pulse",
    disconnected: "bg-red-500",
    error: "bg-red-600",
  };

  const color = statusColors[state] || "bg-slate-400";
  const label = connectionStatusLabel(state);

  return (
    <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-slate-50 border border-slate-100 rounded-lg">
      <span className={`w-2 h-2 rounded-full ${color}`} aria-hidden="true" />
      {showLabel && (
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
          {label}
        </span>
      )}
    </div>
  );
}
