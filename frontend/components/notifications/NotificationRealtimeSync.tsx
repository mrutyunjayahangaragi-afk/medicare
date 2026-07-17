"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

interface NotificationRealtimeSyncProps {
  onNewNotification: (notification: Database["public"]["Tables"]["notifications"]["Row"]) => void;
  onNotificationUpdate: (notification: Database["public"]["Tables"]["notifications"]["Row"]) => void;
}

export default function NotificationRealtimeSync({
  onNewNotification,
  onNotificationUpdate,
}: NotificationRealtimeSyncProps) {
  // Keep stable refs so the channel doesn't re-subscribe on every render
  const onNewRef = useRef(onNewNotification);
  const onUpdateRef = useRef(onNotificationUpdate);
  useEffect(() => { onNewRef.current = onNewNotification; }, [onNewNotification]);
  useEffect(() => { onUpdateRef.current = onNotificationUpdate; }, [onNotificationUpdate]);

  useEffect(() => {
    const supabase = createClient();
    let channel: RealtimeChannel | null = null;

    // Get the authenticated user ID first, then subscribe with the correct filter
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;

      channel = supabase
        .channel(`notifications:${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notifications",
            filter: `recipient_id=eq.${user.id}`,
          },
          (payload) => {
            if (payload.eventType === "INSERT") {
              onNewRef.current(
                payload.new as Database["public"]["Tables"]["notifications"]["Row"]
              );
            } else if (payload.eventType === "UPDATE") {
              onUpdateRef.current(
                payload.new as Database["public"]["Tables"]["notifications"]["Row"]
              );
            }
          }
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            console.debug("[NotificationRealtimeSync] Subscribed for user", user.id.slice(0, 8));
          } else if (status === "CHANNEL_ERROR") {
            console.error("[NotificationRealtimeSync] Channel error");
          }
        });
    });

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
    // Run once on mount — stable refs used inside for callbacks
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
