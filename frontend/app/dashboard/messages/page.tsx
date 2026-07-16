"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, MessageSquare } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import ConversationList from "@/components/messages/ConversationList";

interface Conversation {
  request: any;
  otherParticipantName: string;
  otherParticipantRole: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

export default function UserMessagesPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchConversations = async () => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      
      // Fetch requests with assigned responders that have messages
      const { data: requests, error: requestsError } = await supabase
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
        .not("assigned_responder_id", "is", null)
        .order("created_at", { ascending: false });

      if (requestsError) {
        console.error("[UserMessages] Failed to fetch requests:", requestsError);
        return;
      }

      // For each request, fetch the latest message and unread count
      const conversationsData: Conversation[] = [];
      
      for (const request of requests || []) {
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
          .eq("recipient_id", (await supabase.auth.getUser()).data.user?.id)
          .eq("is_read", false);

        if (messages && messages.length > 0) {
          const profile = Array.isArray(request.profiles) ? request.profiles[0] : request.profiles;
          conversationsData.push({
            request: request,
            otherParticipantName: profile?.full_name || "Responder",
            otherParticipantRole: profile?.responder_type || "Responder",
            lastMessage: messages[0].message,
            lastMessageTime: messages[0].created_at,
            unreadCount: unreadCount || 0,
          });
        }
      }

      setConversations(conversationsData);
    } catch (error) {
      console.error("[UserMessages] Error fetching conversations:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConversationClick = (requestId: string) => {
    router.push(`/dashboard/messages/${requestId}`);
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center gap-3 mb-8"
        >
          <button
            onClick={() => router.push("/dashboard")}
            className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
            aria-label="Go back to dashboard"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Messages</h1>
            <p className="text-slate-600">Communicate with responders about your emergency requests</p>
          </div>
        </motion.div>

        {/* Conversations List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <ConversationList
            conversations={conversations}
            isLoading={isLoading}
            onConversationClick={handleConversationClick}
          />
        </motion.div>
      </div>
    </div>
  );
}
