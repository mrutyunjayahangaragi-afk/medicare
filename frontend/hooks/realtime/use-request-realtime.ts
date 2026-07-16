/**
 * hooks/realtime/use-request-realtime.ts
 * Subscribes to status and assignment changes of a single emergency request.
 *
 * Rules:
 *   - Subscribe to postgres_changes with filter: `id=eq.${requestId}`.
 *   - Validate incoming request ID and compare updated_at to prevent stale states.
 *   - Refetch authoritative state on socket reconnection.
 *   - Deduplicate toasts for identical status transitions.
 *   - Handle cleanups on unmount or request ID changes.
 */

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/Toast";
import type { EmergencyRequest } from "@/types/emergency";
import type { RealtimeConnectionState } from "@/lib/realtime/types";
import { requestStatusChannelName } from "@/lib/realtime/channel-names";
import { subscriptionStatusToConnectionState } from "@/lib/realtime/connection-state";
import { realtimeChannelManager } from "@/lib/realtime/realtime-client";

export function useRequestRealtime(requestId: string | undefined) {
  const { toast } = useToast();
  const [request, setRequest] = useState<EmergencyRequest | null>(null);
  const [connectionState, setConnectionState] = useState<RealtimeConnectionState>("idle");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const prevStatusRef = useRef<string | null>(null);
  const wasDisconnectedRef = useRef(false);
  const currentRequestRef = useRef<EmergencyRequest | null>(null);

  // Authoritative state refetch
  const fetchRequest = async (showLoading = false) => {
    if (!requestId) return;
    if (showLoading) setIsLoading(true);
    try {
      const supabase = createClient();
      const { data, error: fetchError } = await supabase
        .from("emergency_requests")
        .select("*")
        .eq("id", requestId)
        .single();

      if (fetchError) throw fetchError;
      if (data) {
        const req = data as EmergencyRequest;
        setRequest(req);
        currentRequestRef.current = req;
        prevStatusRef.current = req.status;
      }
    } catch (err: any) {
      console.error("[useRequestRealtime] Fetch error:", err);
      setError(err.message || "Failed to fetch request");
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!requestId) {
      setRequest(null);
      currentRequestRef.current = null;
      return;
    }

    // Reset tracking references
    prevStatusRef.current = null;
    currentRequestRef.current = null;
    wasDisconnectedRef.current = false;

    // Fetch initial state
    fetchRequest(true);

    const topic = requestStatusChannelName(requestId);
    const supabase = createClient();

    const channel = realtimeChannelManager.getOrCreateChannel(topic, (chan) => {
      chan.on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "emergency_requests",
          filter: `id=eq.${requestId}`,
        },
        (payload) => {
          const nextRecord = payload.new as EmergencyRequest;
          
          // 1. Validate payload ID
          if (nextRecord.id !== requestId) return;

          // 2. Compare updated_at to ensure newer write wins
          const currentRecord = currentRequestRef.current;
          if (currentRecord && currentRecord.updated_at) {
            if (new Date(nextRecord.updated_at).getTime() <= new Date(currentRecord.updated_at).getTime()) {
              return; // Stale update
            }
          }

          // Update local state
          setRequest(nextRecord);
          currentRequestRef.current = nextRecord;

          // 3. Status change notification (deduplicated)
          if (nextRecord.status !== prevStatusRef.current) {
            const statusLabels: Record<string, string> = {
              pending: "Request submitted",
              accepted: "Responder accepted",
              in_progress: "Responder is on the way",
              arrived: "Responder arrived",
              completed: "Request completed",
              cancelled: "Request cancelled",
            };
            const label = statusLabels[nextRecord.status] || `Status updated to ${nextRecord.status}`;
            toast(label, nextRecord.status === "cancelled" ? "warning" : "success");
            prevStatusRef.current = nextRecord.status;
          }
        }
      );

      chan.subscribe((status) => {
        const nextState = subscriptionStatusToConnectionState(status);
        setConnectionState(nextState);

        if (nextState === "disconnected" || nextState === "error") {
          wasDisconnectedRef.current = true;
        }

        // 4. Recovery: Refetch authoritative state after reconnect
        if (nextState === "connected" && wasDisconnectedRef.current) {
          if (process.env.NODE_ENV === "development") {
            console.log("[useRequestRealtime] Reconnected. Refetching request status.");
          }
          fetchRequest(false);
          wasDisconnectedRef.current = false;
        }
      });
    });

    return () => {
      realtimeChannelManager.releaseChannel(topic);
    };
  }, [requestId]);

  return {
    request,
    isLoading,
    error,
    connectionState,
    refetch: () => fetchRequest(false),
  };
}
