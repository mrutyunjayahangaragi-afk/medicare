"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Send, AlertCircle } from "lucide-react";

interface MessageComposerProps {
  onSendMessage: (message: string) => Promise<void>;
  isSending: boolean;
  disabled: boolean;
  disabledReason?: string;
}

export default function MessageComposer({
  onSendMessage,
  isSending,
  disabled,
  disabledReason,
}: MessageComposerProps) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmed = message.trim();
    if (!trimmed) {
      setError("Please enter a message");
      return;
    }

    if (trimmed.length > 1000) {
      setError("Message must be less than 1000 characters");
      return;
    }

    try {
      await onSendMessage(trimmed);
      setMessage("");
    } catch (err) {
      setError("Failed to send message. Please try again.");
    }
  };

  const characterCount = message.length;
  const isNearLimit = characterCount > 900;
  const isAtLimit = characterCount >= 1000;

  return (
    <div className="border-t border-slate-200 p-4 bg-white">
      {disabled && disabledReason && (
        <div className="flex items-center gap-2 text-amber-600 text-sm mb-3">
          <AlertCircle className="w-4 h-4" />
          <span>{disabledReason}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex gap-3">
        <div className="flex-1 relative">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={disabled || isSending}
            placeholder="Type your message..."
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            rows={1}
            maxLength={1000}
          />
          <div className="absolute bottom-2 right-2 text-xs text-slate-400">
            {characterCount}/1000
          </div>
        </div>

        <motion.button
          type="submit"
          disabled={disabled || isSending || !message.trim()}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl flex items-center gap-2 transition-colors"
        >
          {isSending ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Send className="w-5 h-5" />
              <span className="hidden sm:inline">Send</span>
            </>
          )}
        </motion.button>
      </form>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-2 text-sm text-red-600"
        >
          {error}
        </motion.div>
      )}
    </div>
  );
}
