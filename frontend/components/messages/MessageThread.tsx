"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { AlertCircle } from "lucide-react";
import MessageBubble from "./MessageBubble";
import type { Database } from "@/types/database";

interface MessageThreadProps {
  messages: Database["public"]["Tables"]["request_messages"]["Row"][];
  currentUserId: string;
  senderName?: string;
  recipientName?: string;
  isLoading: boolean;
}

export default function MessageThread({
  messages,
  currentUserId,
  senderName,
  recipientName,
  isLoading,
}: MessageThreadProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  if (isLoading) {
    return (
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className={`flex ${i % 2 === 0 ? "justify-end" : "justify-start"}`}>
            <div className="animate-pulse w-64 h-16 bg-slate-100 rounded-2xl" />
          </div>
        ))}
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No messages yet</h3>
          <p className="text-slate-500 max-w-sm">
            Start a conversation to communicate about this emergency request.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="max-w-3xl mx-auto">
        {messages.map((message) => {
          const isOwnMessage = message.sender_id === currentUserId;
          return (
            <MessageBubble
              key={message.id}
              message={message}
              isOwnMessage={isOwnMessage}
              senderName={isOwnMessage ? undefined : recipientName}
            />
          );
        })}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
