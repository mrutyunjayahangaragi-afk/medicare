/**
 * hooks/realtime/use-realtime-connection.ts
 * Manages channel connection states and exposes connection status mapping.
 */

import { useState, useEffect } from "react";
import type { RealtimeConnectionState } from "@/lib/realtime/types";
import { subscriptionStatusToConnectionState } from "@/lib/realtime/connection-state";
import { realtimeChannelManager } from "@/lib/realtime/realtime-client";

export function useRealtimeConnection(topic: string) {
  const [connectionState, setConnectionState] = useState<RealtimeConnectionState>("connecting");

  useEffect(() => {
    if (!topic) return;

    const channel = realtimeChannelManager.getOrCreateChannel(topic, (chan) => {
      chan.subscribe((status) => {
        setConnectionState(subscriptionStatusToConnectionState(status));
      });
    });

    return () => {
      realtimeChannelManager.releaseChannel(topic);
    };
  }, [topic]);

  return connectionState;
}
