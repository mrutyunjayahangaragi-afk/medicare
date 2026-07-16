"use client";

import { motion } from "framer-motion";
import { Check, CheckCheck } from "lucide-react";
import type { Database } from "@/types/database";

interface MessageBubbleProps {
  message: Database["public"]["Tables"]["request_messages"]["Row"];
  isOwnMessage: boolean;
  senderName?: string;
}

export default function MessageBubble({ message, isOwnMessage, senderName }: MessageBubbleProps) {
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isOwnMessage ? "justify-end" : "justify-start"} mb-4`}
    >
      <div className={`max-w-[70%] ${isOwnMessage ? "order-2" : "order-1"}`}>
        {!isOwnMessage && senderName && (
          <p className="text-xs text-slate-500 mb-1 ml-1">{senderName}</p>
        )}
        <div
          className={`px-4 py-2 rounded-2xl ${
            isOwnMessage
              ? "bg-blue-500 text-white rounded-br-sm"
              : "bg-slate-100 text-slate-900 rounded-bl-sm"
          }`}
        >
          <p className="text-sm">{message.message}</p>
          <div className={`flex items-center gap-1 mt-1 ${isOwnMessage ? "justify-end" : "justify-start"}`}>
            <span className={`text-xs ${isOwnMessage ? "text-blue-100" : "text-slate-400"}`}>
              {formatTime(message.created_at)}
            </span>
            {isOwnMessage && message.is_read && (
              <CheckCheck className="w-3 h-3 text-blue-100" />
            )}
            {isOwnMessage && !message.is_read && (
              <Check className="w-3 h-3 text-blue-100" />
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
