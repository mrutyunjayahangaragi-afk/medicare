"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, AlertCircle, Phone } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import MessageThread from "@/components/messages/MessageThread";
import MessageComposer from "@/components/messages/MessageComposer";
import MessageRealtimeSync from "@/components/messages/MessageRealtimeSync";
import type { Database } from "@/types/database";
import { EMERGENCY_TYPES } from "@/types/emergency";

export default function UserConversationPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [request, setRequest] = useState<any>(null);
  const [responderProfile, setResponderProfile] = useState<any>(null);
  const [messages, setMessages] = useState<Database["public"]["Tables"]["request_messages"]["Row"][]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadConversation = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      setCurrentUserId(user.id);

      // Fetch request
      const { data: requestData, error: requestError } = await supabase
        .from("emergency_requests")
        .select(`
          *,
          profiles!emergency_requests_assigned_responder_id_fkey (
            id,
            full_name,
            responder_type,
            phone
          )
        `)
        .eq("id", params.id)
        .single();

      if (requestError) throw requestError;

      // Check if user owns this request
      if (requestData.user_id !== user.id) {
        setError("You don't have permission to view this conversation");
        return;
      }

      setRequest(requestData);
      const profile = Array.isArray(requestData.profiles) ? requestData.profiles[0] : requestData.profiles;
      setResponderProfile(profile);

      // Fetch messages
      const { data: messagesData, error: messagesError } = await supabase
        .from("request_messages")
        .select("*")
        .eq("request_id", params.id)
        .order("created_at", { ascending: true });

      if (messagesError) throw messagesError;
      setMessages(messagesData || []);

      // Mark messages as read
      await supabase.rpc("mark_request_messages_read", { p_request_id: params.id });
    } catch (err) {
      console.error("[UserConversation] Error loading conversation:", err);
      setError("Failed to load conversation");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (message: string) => {
    setIsSending(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.rpc("send_request_message", {
        p_request_id: params.id,
        p_message_text: message,
      });

      if (error) throw error;
    } catch (err) {
      console.error("[UserConversation] Failed to send message:", err);
      throw err;
    } finally {
      setIsSending(false);
    }
  };

  const isMessagingAvailable = () => {
    if (!request) return false;
    return request.assigned_responder_id !== null && 
           request.status !== "cancelled";
  };

  useEffect(() => {
    loadConversation();
  }, [params.id]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-12 bg-slate-200 rounded-xl" />
            <div className="h-96 bg-slate-200 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-16"
          >
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
              <AlertCircle className="w-10 h-10 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">
              {error || "Conversation Not Found"}
            </h2>
            <p className="text-slate-500 text-center max-w-md mb-8">
              The conversation you're looking for doesn't exist or you don't have permission to view it.
            </p>
            <button
              onClick={() => router.push("/dashboard/messages")}
              className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl transition-colors"
            >
              Back to Messages
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  const emergencyType = EMERGENCY_TYPES.find((t) => t.id === request.emergency_type);
  const disabled = !isMessagingAvailable();
  const disabledReason = !request.assigned_responder_id 
    ? "Messaging will become available after a responder accepts your request."
    : request.status === "cancelled"
    ? "This request has been cancelled."
    : undefined;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <MessageRealtimeSync
        requestId={params.id}
        onNewMessage={(message) => {
          setMessages((prev) => [...prev, message]);
        }}
        onMessageUpdate={(message) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === message.id ? message : m))
          );
        }}
      />

      {/* Header */}
      <div className="bg-white border-b border-slate-200 p-4 sm:p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push("/dashboard/messages")}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                aria-label="Go back to messages"
              >
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </button>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-slate-900">
                  {responderProfile?.full_name || "Responder"}
                </h1>
                <p className="text-sm text-slate-600">
                  {responderProfile?.responder_type || "Responder"} • {emergencyType?.label || "Emergency"}
                </p>
              </div>
            </div>
            {responderProfile?.phone && (
              <a
                href={`tel:${responderProfile.phone}`}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                aria-label="Call responder"
              >
                <Phone className="w-5 h-5 text-slate-600" />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-hidden">
        <MessageThread
          messages={messages}
          currentUserId={currentUserId || ""}
          senderName={responderProfile?.full_name}
          recipientName="You"
          isLoading={false}
        />
      </div>

      {/* Composer */}
      <MessageComposer
        onSendMessage={handleSendMessage}
        isSending={isSending}
        disabled={disabled}
        disabledReason={disabledReason}
      />
    </div>
  );
}
