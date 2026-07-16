/**
 * components/realtime/ResponderRealtimeProvider.tsx
 * Authenticated responder realtime provider context.
 * Mounts in layout, subscribes to assignments and available requests.
 */

"use client";

import React, { createContext, useContext } from "react";
import { useResponderAssignments } from "@/hooks/realtime/use-responder-assignments";
import type { RealtimeConnectionState } from "@/lib/realtime/types";
import type { EmergencyRequest } from "@/types/emergency";

interface ResponderRealtimeContextValue {
  available: EmergencyRequest[];
  assigned: EmergencyRequest[];
  connectionState: RealtimeConnectionState;
  refetch: () => Promise<void> | void;
}

const ResponderRealtimeContext = createContext<ResponderRealtimeContextValue | null>(null);

export function ResponderRealtimeProvider({
  responderId,
  children,
}: {
  responderId: string;
  children: React.ReactNode;
}) {
  const realtime = useResponderAssignments(responderId);

  return (
    <ResponderRealtimeContext.Provider value={realtime}>
      {children}
    </ResponderRealtimeContext.Provider>
  );
}

export function useResponderRealtime() {
  const ctx = useContext(ResponderRealtimeContext);
  if (!ctx) {
    throw new Error("useResponderRealtime must be used inside ResponderRealtimeProvider");
  }
  return ctx;
}
