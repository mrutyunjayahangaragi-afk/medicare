import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database";

export async function fetchMessages(requestId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("request_messages")
    .select("*")
    .eq("request_id", requestId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[messaging] fetch messages:", error);
    return [];
  }

  return (data || []) as Database["public"]["Tables"]["request_messages"]["Row"][];
}

export async function sendMessage(requestId: string, message: string) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("send_request_message", {
    p_request_id: requestId,
    p_message_text: message,
  });

  if (error) {
    console.error("[messaging] send message:", error);
    throw error;
  }

  return data;
}

export async function markMessagesAsRead(requestId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("mark_request_messages_read", {
    p_request_id: requestId,
  });

  if (error) {
    console.error("[messaging] mark as read:", error);
    throw error;
  }
}

export async function fetchConversations(userRole: "user" | "responder") {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const userId = user.id;

  let requests;
  if (userRole === "user") {
    // Fetch user's requests with assigned responders
    const { data } = await supabase
      .from("emergency_requests")
      .select(`
        id,
        emergency_type,
        status,
        assigned_responder_id,
        profiles!emergency_requests_assigned_responder_id_fkey (
          id,
          full_name,
          responder_type
        )
      `)
      .eq("user_id", userId)
      .not("assigned_responder_id", "is", null)
      .order("created_at", { ascending: false });
    requests = data;
  } else {
    // Fetch responder's assigned requests
    const { data } = await supabase
      .from("emergency_requests")
      .select(`
        id,
        emergency_type,
        status,
        user_id,
        profiles!emergency_requests_user_id_fkey (
          id,
          full_name,
          phone
        )
      `)
      .eq("assigned_responder_id", userId)
      .order("created_at", { ascending: false });
    requests = data;
  }

  if (!requests) return [];

  const conversations = [];

  for (const request of requests) {
    const { data: messages } = await supabase
      .from("request_messages")
      .select("*")
      .eq("request_id", request.id)
      .order("created_at", { ascending: false })
      .limit(1);

    const { count: unreadCount } = await supabase
      .from("request_messages")
      .select("*", { count: "exact", head: true })
      .eq("request_id", request.id)
      .eq("recipient_id", userId)
      .eq("is_read", false);

    if (messages && messages.length > 0) {
      const profile = Array.isArray(request.profiles) ? request.profiles[0] : request.profiles;
      const otherParticipantRole = userRole === "user" 
        ? ((profile as any)?.responder_type || "Responder") 
        : "Patient";
      conversations.push({
        request: request,
        otherParticipantName: profile?.full_name || userRole === "user" ? "Responder" : "Patient",
        otherParticipantRole: otherParticipantRole,
        lastMessage: messages[0].message,
        lastMessageTime: messages[0].created_at,
        unreadCount: unreadCount || 0,
      });
    }
  }

  return conversations;
}

export function subscribeToMessages(
  requestId: string,
  onNewMessage: (message: Database["public"]["Tables"]["request_messages"]["Row"]) => void,
  onMessageUpdate: (message: Database["public"]["Tables"]["request_messages"]["Row"]) => void
) {
  const supabase = createClient();
  const channel = supabase
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
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
