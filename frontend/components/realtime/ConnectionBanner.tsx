/**
 * components/realtime/ConnectionBanner.tsx
 * Subtle full-width warning banner shown when offline or reconnecting.
 */

"use client";

import React from "react";
import { WifiOff, Loader2 } from "lucide-react";
import type { RealtimeConnectionState } from "@/lib/realtime/types";

interface ConnectionBannerProps {
  state: RealtimeConnectionState;
}

export default function ConnectionBanner({ state }: ConnectionBannerProps) {
  if (state === "connected" || state === "idle") return null;

  const config = {
    connecting: {
      bg: "bg-amber-50 border-amber-200 text-amber-800",
      icon: <Loader2 className="w-4 h-4 animate-spin text-amber-500" />,
      text: "Connecting to live service…",
    },
    reconnecting: {
      bg: "bg-amber-50 border-amber-200 text-amber-800",
      icon: <Loader2 className="w-4 h-4 animate-spin text-amber-500" />,
      text: "Reconnecting to live updates…",
    },
    disconnected: {
      bg: "bg-red-50 border-red-200 text-red-800",
      icon: <WifiOff className="w-4 h-4 text-red-500" />,
      text: "Offline. Updates paused.",
    },
    error: {
      bg: "bg-red-50 border-red-200 text-red-800",
      icon: <WifiOff className="w-4 h-4 text-red-500" />,
      text: "Connection failed. Please check your network.",
    },
  };

  const current = config[state as keyof typeof config] || config.disconnected;

  return (
    <div className={`w-full flex items-center justify-center gap-2 py-2 px-4 border-b text-xs font-semibold ${current.bg} transition-all`}>
      {current.icon}
      <span>{current.text}</span>
    </div>
  );
}
