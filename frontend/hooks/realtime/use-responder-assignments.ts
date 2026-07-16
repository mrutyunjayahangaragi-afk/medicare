/**
 * hooks/realtime/use-responder-assignments.ts
 * Realtime coordination hook for responders.
 *
 * Rules:
 *   - Available subscription filter: `status=eq.pending`.
 *   - Assigned subscription filter: `assigned_responder_id=eq.${responderId}`.
 *   - Updates available/assigned lists dynamically on INSERT and UPDATE events.
 *   - Refetches list from authoritative API/DB on reconnect.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { EmergencyRequest } from "@/types/emergency";
import type { RealtimeConnectionState } from "@/lib/realtime/types";
import { subscriptionStatusToConnectionState } from "@/lib/realtime/connection-state";
import { fetchAvailableRequests, fetchAssignedRequests } from "@/lib/responder";
import { realtimeChannelManager } from "@/lib/realtime/realtime-client";

export function useResponderAssignments(responderId: string | undefined) {
  const [available, setAvailable] = useState<EmergencyRequest[]>([]);
  const [assigned, setAssigned] = useState<EmergencyRequest[]>([]);
  const [connectionState, setConnectionState] = useState<RealtimeConnectionState>("idle");

  const wasDisconnectedRef = useRef(false);

  const loadData = useCallback(async () => {
    if (!responderId) return;
    try {
      const availList = await fetchAvailableRequests();
      const assgnList = await fetchAssignedRequests();
      setAvailable(availList);
      setAssigned(assgnList);
    } catch (err) {
      console.error("[useResponderAssignments] Init load failed:", err);
    }
  }, [responderId]);

  useEffect(() => {
    if (!responderId) {
      setAvailable([]);
      setAssigned([]);
      return;
    }

    loadData();

    const supabase = createClient();
    const wasDisconnected = wasDisconnectedRef;

    // 1. Available Requests subscription: status=eq.pending
    const availableTopic = `available_requests_${responderId}`;
    const availableChannel = realtimeChannelManager.getOrCreateChannel(availableTopic, (chan) => {
      chan.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "emergency_requests",
          filter: "status=eq.pending",
        },
        (payload) => {
          const { eventType, new: newRec, old: oldRec } = payload;
          const fresh = newRec as EmergencyRequest;

          if (eventType === "INSERT") {
            if (fresh.assigned_responder_id === null) {
              setAvailable((prev) => {
                if (prev.some((r) => r.id === fresh.id)) return prev;
                return [...prev, fresh].sort(
                  (a, b) => (a.severity === "critical" ? -1 : 1) // Critical first
                );
              });
            }
          } else if (eventType === "UPDATE") {
            // If assigned to someone else, remove it from available
            if (fresh.assigned_responder_id !== null) {
              setAvailable((prev) => prev.filter((r) => r.id !== fresh.id));
            } else {
              // Update available list details
              setAvailable((prev) =>
                prev.map((r) => (r.id === fresh.id ? fresh : r))
              );
            }
          } else if (eventType === "DELETE") {
            const oldId = oldRec?.id;
            if (oldId) {
              setAvailable((prev) => prev.filter((r) => r.id !== oldId));
            }
          }
        }
      );
    });

    // 2. Assigned Requests subscription: assigned_responder_id=eq.{responderId}
    const assignedTopic = `assigned_requests_${responderId}`;
    const assignedChannel = realtimeChannelManager.getOrCreateChannel(assignedTopic, (chan) => {
      chan.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "emergency_requests",
          filter: `assigned_responder_id=eq.${responderId}`,
        },
        (payload) => {
          const { eventType, new: newRec, old: oldRec } = payload;
          const fresh = newRec as EmergencyRequest;

          if (eventType === "INSERT" || eventType === "UPDATE") {
            // If status is terminal (completed or cancelled), remove from active assignments
            if (fresh.status === "completed" || fresh.status === "cancelled") {
              setAssigned((prev) => prev.filter((r) => r.id !== fresh.id));
            } else {
              setAssigned((prev) => {
                const filtered = prev.filter((r) => r.id !== fresh.id);
                return [fresh, ...filtered];
              });
            }
          } else if (eventType === "DELETE") {
            const oldId = oldRec?.id;
            if (oldId) {
              setAssigned((prev) => prev.filter((r) => r.id !== oldId));
            }
          }
        }
      );

      chan.subscribe((status) => {
        const nextState = subscriptionStatusToConnectionState(status);
        setConnectionState(nextState);

        if (nextState === "disconnected" || nextState === "error") {
          wasDisconnected.current = true;
        }

        // Recovery: Refetch lists on reconnect
        if (nextState === "connected" && wasDisconnected.current) {
          if (process.env.NODE_ENV === "development") {
            console.log("[useResponderAssignments] Reconnected. Refetching assignments list.");
          }
          loadData();
          wasDisconnected.current = false;
        }
      });
    });

    return () => {
      realtimeChannelManager.releaseChannel(availableTopic);
      realtimeChannelManager.releaseChannel(assignedTopic);
    };
  }, [responderId, loadData]);

  return {
    available,
    assigned,
    connectionState,
    refetch: loadData,
  };
}
