"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

interface MessageRealtimeSyncProps {
  requestId: string;
  onNewMessage: (message: Database["public"]["Tables"]["request_messages"]["Row"]) => void;
  onMessageUpdate: (message: Database["public"]["Tables"]["request_messages"]["Row"]) => void;
}

export default function MessageRealtimeSync({
  requestId,
  onNewMessage,
  onMessageUpdate,
}: MessageRealtimeSyncProps) {
  useEffect(() => {
    const supabase = createClient();
    const channel: RealtimeChannel = supabase
      .channel(`request_messages_${requestId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "request_messages",
          filter: `request_id=eq.${requestId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            onNewMessage(payload.new as Database["public"]["Tables"]["request_messages"]["Row"]);
          } else if (payload.eventType === "UPDATE") {
            onMessageUpdate(payload.new as Database["public"]["Tables"]["request_messages"]["Row"]);
          }
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("[MessageRealtimeSync] Subscribed to messages for request:", requestId);
        } else if (status === "CHANNEL_ERROR") {
          console.error("[MessageRealtimeSync] Channel error");
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [requestId, onNewMessage, onMessageUpdate]);

  return null;
}
