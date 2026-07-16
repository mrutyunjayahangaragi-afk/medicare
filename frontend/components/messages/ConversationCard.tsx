"use client";

import { motion } from "framer-motion";
import { MessageSquare, Clock } from "lucide-react";
import type { EmergencyRequest } from "@/types/emergency";
import { EMERGENCY_TYPES } from "@/types/emergency";

interface ConversationCardProps {
  request: EmergencyRequest;
  otherParticipantName: string;
  otherParticipantRole: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  onClick: () => void;
}

export default function ConversationCard({
  request,
  otherParticipantName,
  otherParticipantRole,
  lastMessage,
  lastMessageTime,
  unreadCount,
  onClick,
}: ConversationCardProps) {
  const emergencyType = EMERGENCY_TYPES.find((t) => t.id === request.emergency_type);
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-700";
      case "cancelled":
        return "bg-red-100 text-red-700";
      case "in_progress":
      case "volunteer_assigned":
      case "hospital_assigned":
        return "bg-blue-100 text-blue-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className="w-full text-left p-4 bg-white border border-slate-200 rounded-xl hover:border-slate-300 hover:shadow-sm transition-all"
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
          <MessageSquare className="w-6 h-6 text-indigo-600" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <h4 className="font-semibold text-slate-900">{otherParticipantName}</h4>
              <p className="text-sm text-slate-500">{otherParticipantRole}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {unreadCount > 0 && (
                <div className="w-5 h-5 bg-blue-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </div>
              )}
            </div>
          </div>

          {/* Emergency Info */}
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(request.status)}`}>
              {request.status.replace("_", " ")}
            </span>
            {emergencyType && (
              <span className="text-xs text-slate-500">{emergencyType.label}</span>
            )}
          </div>

          {/* Last Message */}
          <div className="flex items-start gap-2">
            <p className="text-sm text-slate-600 line-clamp-1 flex-1">{lastMessage}</p>
            <div className="flex items-center gap-1 text-xs text-slate-400 flex-shrink-0">
              <Clock className="w-3 h-3" />
              {formatRelativeTime(lastMessageTime)}
            </div>
          </div>
        </div>
      </div>
    </motion.button>
  );
}
