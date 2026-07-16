"use client";

import { useEffect } from "react";
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
  useEffect(() => {
    const supabase = createClient();
    const channel: RealtimeChannel = supabase
      .channel("notifications_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `recipient_id=eq.${supabase.auth.getUser().then(({ data: { user } }) => user?.id)}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            onNewNotification(payload.new as Database["public"]["Tables"]["notifications"]["Row"]);
          } else if (payload.eventType === "UPDATE") {
            onNotificationUpdate(payload.new as Database["public"]["Tables"]["notifications"]["Row"]);
          }
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("[NotificationRealtimeSync] Subscribed to notifications");
        } else if (status === "CHANNEL_ERROR") {
          console.error("[NotificationRealtimeSync] Channel error");
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [onNewNotification, onNotificationUpdate]);

  return null;
}
