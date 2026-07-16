"use client";

import { motion } from "framer-motion";
import { MessageSquare } from "lucide-react";
import ConversationCard from "./ConversationCard";

interface Conversation {
  request: any;
  otherParticipantName: string;
  otherParticipantRole: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

interface ConversationListProps {
  conversations: Conversation[];
  isLoading: boolean;
  onConversationClick: (requestId: string) => void;
}

export default function ConversationList({
  conversations,
  isLoading,
  onConversationClick,
}: ConversationListProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="animate-pulse p-4 bg-slate-100 rounded-xl">
            <div className="h-5 bg-slate-200 rounded w-1/3 mb-2" />
            <div className="h-4 bg-slate-200 rounded w-2/3 mb-2" />
            <div className="h-3 bg-slate-200 rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
          <MessageSquare className="w-8 h-8 text-slate-400" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">No conversations yet</h3>
        <p className="text-slate-500 text-center max-w-sm">
          Messages will appear here when you communicate with responders about your emergency requests.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {conversations.map((conversation) => (
        <ConversationCard
          key={conversation.request.id}
          request={conversation.request}
          otherParticipantName={conversation.otherParticipantName}
          otherParticipantRole={conversation.otherParticipantRole}
          lastMessage={conversation.lastMessage}
          lastMessageTime={conversation.lastMessageTime}
          unreadCount={conversation.unreadCount}
          onClick={() => onConversationClick(conversation.request.id)}
        />
      ))}
    </div>
  );
}
