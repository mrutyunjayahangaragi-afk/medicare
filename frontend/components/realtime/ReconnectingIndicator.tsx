/**
 * components/realtime/ReconnectingIndicator.tsx
 * Displayed in cards/pages when the app is attempting to reconnect.
 */

"use client";

import React from "react";
import { Loader2 } from "lucide-react";
import type { RealtimeConnectionState } from "@/lib/realtime/types";

interface ReconnectingIndicatorProps {
  state: RealtimeConnectionState;
}

export default function ReconnectingIndicator({ state }: ReconnectingIndicatorProps) {
  if (state !== "reconnecting" && state !== "connecting") return null;

  return (
    <div className="flex items-center gap-2 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200/55 rounded-xl px-3 py-1.5 animate-pulse">
      <Loader2 className="w-3.5 h-3.5 animate-spin" />
      <span>Reconnecting to live source…</span>
    </div>
  );
}
