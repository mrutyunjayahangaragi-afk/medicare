/**
 * hooks/realtime/use-notifications-realtime.ts
 * Scoped realtime notification hook.
 *
 * Rules:
 *   - Subscribe using: recipient_id=eq.${userId}.
 *   - Deduplicate by notification ID.
 *   - Maintain unread counts safely (never negative).
 *   - Handle INSERT and UPDATE (read state) events.
 *   - Refetch unread counts and notifications on reconnection.
 */

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database";
import type { RealtimeConnectionState } from "@/lib/realtime/types";
import { userNotificationsChannelName } from "@/lib/realtime/channel-names";
import { subscriptionStatusToConnectionState } from "@/lib/realtime/connection-state";
import { realtimeChannelManager } from "@/lib/realtime/realtime-client";
import { fetchNotifications, getUnreadNotificationCount } from "@/lib/notifications";

type NotificationRow = Database["public"]["Tables"]["notifications"]["Row"];

export function useNotificationsRealtime(userId: string | undefined) {
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [connectionState, setConnectionState] = useState<RealtimeConnectionState>("idle");

  const knownIdsRef = useRef<Set<string>>(new Set());
  const wasDisconnectedRef = useRef(false);

  const loadInitialData = async () => {
    if (!userId) return;
    try {
      const list = await fetchNotifications(50);
      const count = await getUnreadNotificationCount();

      // Initialize ID tracking Set
      knownIdsRef.current = new Set(list.map((n) => n.id));
      setNotifications(list);
      setUnreadCount(Math.max(0, count));
    } catch (err) {
      console.error("[useNotificationsRealtime] Init error:", err);
    }
  };

  useEffect(() => {
    if (!userId) {
      setNotifications([]);
      setUnreadCount(0);
      knownIdsRef.current.clear();
      return;
    }

    loadInitialData();

    const topic = userNotificationsChannelName(userId);
    const wasDisconnected = wasDisconnectedRef;

    const channel = realtimeChannelManager.getOrCreateChannel(topic, (chan) => {
      chan.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `recipient_id=eq.${userId}`,
        },
        (payload) => {
          const { eventType, new: newRec, old: oldRec } = payload;

          if (eventType === "INSERT") {
            const fresh = newRec as NotificationRow;

            // Deduplicate by ID
            if (knownIdsRef.current.has(fresh.id)) return;
            knownIdsRef.current.add(fresh.id);

            setNotifications((prev) => [fresh, ...prev].slice(0, 50));
            if (!fresh.is_read) {
              setUnreadCount((prev) => prev + 1);
            }
          } else if (eventType === "UPDATE") {
            const updated = newRec as NotificationRow;
            const previous = oldRec as NotificationRow | null;

            setNotifications((prev) =>
              prev.map((n) => (n.id === updated.id ? updated : n))
            );

            // Update unread count safely
            const wasUnread = previous ? !previous.is_read : true; // default assume unread
            if (wasUnread && updated.is_read) {
              setUnreadCount((prev) => Math.max(0, prev - 1));
            } else if (!wasUnread && !updated.is_read) {
              setUnreadCount((prev) => prev + 1);
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

        // Recovery: Refetch unread counts and notifications on reconnect
        if (nextState === "connected" && wasDisconnected.current) {
          if (process.env.NODE_ENV === "development") {
            console.log("[useNotificationsRealtime] Reconnected. Refetching notifications.");
          }
          loadInitialData();
          wasDisconnected.current = false;
        }
      });
    });

    return () => {
      realtimeChannelManager.releaseChannel(topic);
    };
  }, [userId]);

  return {
    notifications,
    unreadCount,
    connectionState,
    refetch: loadInitialData,
  };
}
