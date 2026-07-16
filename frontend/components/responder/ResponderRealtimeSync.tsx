"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { EmergencyRequest } from "@/types/emergency";

interface ResponderRealtimeSyncProps {
  onRequestUpdate?: (request: EmergencyRequest) => void;
  onRequestRemoved?: (requestId: string) => void;
  onRequestAdded?: (request: EmergencyRequest) => void;
  onStatsUpdate?: () => void;
}

export default function ResponderRealtimeSync({
  onRequestUpdate,
  onRequestRemoved,
  onRequestAdded,
  onStatsUpdate,
}: ResponderRealtimeSyncProps) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    const supabase = createClient();

    // Subscribe to emergency_requests changes
    const channel = supabase
      .channel("emergency_requests_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "emergency_requests",
        },
        (payload) => {
          if (!mountedRef.current) return;

          const { eventType, new: newRecord, old: oldRecord } = payload;

          switch (eventType) {
            case "INSERT":
              if (newRecord && onRequestAdded) {
                onRequestAdded(newRecord as EmergencyRequest);
              }
              if (onStatsUpdate) onStatsUpdate();
              break;

            case "UPDATE":
              if (newRecord && onRequestUpdate) {
                onRequestUpdate(newRecord as EmergencyRequest);
              }
              // If request was assigned to someone else, remove from available list
              if (
                oldRecord &&
                newRecord &&
                oldRecord.assigned_responder_id === null &&
                newRecord.assigned_responder_id !== null &&
                onRequestRemoved
              ) {
                onRequestRemoved(newRecord.id);
              }
              if (onStatsUpdate) onStatsUpdate();
              break;

            case "DELETE":
              if (oldRecord && onRequestRemoved) {
                onRequestRemoved(oldRecord.id);
              }
              if (onStatsUpdate) onStatsUpdate();
              break;
          }
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("[ResponderRealtime] Subscribed to emergency requests");
        } else if (status === "CHANNEL_ERROR") {
          console.error("[ResponderRealtime] Channel error");
        }
      });

    channelRef.current = channel;

    return () => {
      mountedRef.current = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        console.log("[ResponderRealtime] Unsubscribed from emergency requests");
      }
    };
  }, [onRequestUpdate, onRequestRemoved, onRequestAdded, onStatsUpdate]);

  return null;
}
