/**
 * hooks/realtime/use-messages-realtime.ts
 * Realtime messaging hook with optimistic updates and rollback support.
 *
 * Rules:
 *   - Subscribe using `request_id=eq.${requestId}` filter.
 *   - Deduplicate by message ID.
 *   - Maintain chronological sorting.
 *   - Expose sending action with optimistic state insert and rollback on failure.
 *   - Mark incoming messages read ONLY through the secure REST/RPC API.
 *   - Recover and refetch messages since last known timestamp on reconnect.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database";
import type { RealtimeConnectionState } from "@/lib/realtime/types";
import { requestMessagesChannelName } from "@/lib/realtime/channel-names";
import { subscriptionStatusToConnectionState } from "@/lib/realtime/connection-state";
import { realtimeChannelManager } from "@/lib/realtime/realtime-client";

type MessageRow = Database["public"]["Tables"]["request_messages"]["Row"];

export function useMessagesRealtime(requestId: string | undefined, currentUserId: string | null) {
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [connectionState, setConnectionState] = useState<RealtimeConnectionState>("idle");
  const [isSending, setIsSending] = useState(false);

  const knownIdsRef = useRef<Set<string>>(new Set());
  const wasDisconnectedRef = useRef(false);
  const messagesRef = useRef<MessageRow[]>([]);

  // Keep ref up to date to prevent stale closures in callbacks
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const loadInitialMessages = async () => {
    if (!requestId) return;
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("request_messages")
        .select("*")
        .eq("request_id", requestId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      if (data) {
        knownIdsRef.current = new Set(data.map((m) => m.id));
        setMessages(data);
      }
    } catch (err) {
      console.error("[useMessagesRealtime] Fetch error:", err);
    }
  };

  const markAsRead = useCallback(async () => {
    if (!requestId) return;
    try {
      const supabase = createClient();
      await supabase.rpc("mark_request_messages_read", { p_request_id: requestId });
    } catch (err) {
      console.error("[useMessagesRealtime] Failed to mark read:", err);
    }
  }, [requestId]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!requestId || !currentUserId || !text.trim()) return;

      const tempId = `optimistic-${Date.now()}-${Math.random()}`;
      const tempMessage: MessageRow = {
        id: tempId,
        request_id: requestId,
        sender_id: currentUserId,
        recipient_id: "", // will be set by RPC/DB
        message: text,
        message_type: "text",
        attachment_path: null,
        is_read: false,
        read_at: null,
        created_at: new Date().toISOString(),
        edited_at: null,
        updated_at: new Date().toISOString(),
      };

      // 1. Optimistic insert
      setMessages((prev) => [...prev, tempMessage]);
      setIsSending(true);

      try {
        const supabase = createClient();
        const { error } = await supabase.rpc("send_request_message", {
          p_request_id: requestId,
          p_message_text: text,
        });

        if (error) throw error;

        // The subscription payload INSERT event will arrive, which will match
        // and replace the optimistic item based on message body, or it'll just be appended.
        // Let's filter out the optimistic message once the actual message gets inserted.
        // We will remove the temp message from the list.
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
      } catch (err) {
        console.error("[useMessagesRealtime] Send message failed:", err);
        // Rollback optimistic update
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        throw err;
      } finally {
        setIsSending(false);
      }
    },
    [requestId, currentUserId]
  );

  useEffect(() => {
    if (!requestId) {
      setMessages([]);
      knownIdsRef.current.clear();
      return;
    }

    loadInitialMessages();

    const topic = requestMessagesChannelName(requestId);
    const wasDisconnected = wasDisconnectedRef;

    const channel = realtimeChannelManager.getOrCreateChannel(topic, (chan) => {
      chan.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "request_messages",
          filter: `request_id=eq.${requestId}`,
        },
        (payload) => {
          const { eventType, new: newRec } = payload;
          const fresh = newRec as MessageRow;

          if (eventType === "INSERT") {
            // Deduplicate by ID
            if (knownIdsRef.current.has(fresh.id)) return;
            knownIdsRef.current.add(fresh.id);

            setMessages((prev) => {
              // Ensure we do not add duplicates and preserve chronological order
              const filtered = prev.filter((m) => m.id !== fresh.id);
              return [...filtered, fresh].sort(
                (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
              );
            });

            // Mark read if user is recipient (mark read through API only)
            if (fresh.sender_id !== currentUserId) {
              markAsRead();
            }
          } else if (eventType === "UPDATE") {
            setMessages((prev) =>
              prev.map((m) => (m.id === fresh.id ? fresh : m))
            );
          }
        }
      );

      chan.subscribe((status) => {
        const nextState = subscriptionStatusToConnectionState(status);
        setConnectionState(nextState);

        if (nextState === "disconnected" || nextState === "error") {
          wasDisconnected.current = true;
        }

        // Recovery: Refetch messages after the last known timestamp on reconnect
        if (nextState === "connected" && wasDisconnected.current) {
          if (process.env.NODE_ENV === "development") {
            console.log("[useMessagesRealtime] Reconnected. Refetching message thread.");
          }
          loadInitialMessages();
          wasDisconnected.current = false;
        }
      });
    });

    return () => {
      realtimeChannelManager.releaseChannel(topic);
    };
  }, [requestId, currentUserId, markAsRead]);

  return {
    messages,
    connectionState,
    isSending,
    sendMessage,
    markAsRead,
  };
}
