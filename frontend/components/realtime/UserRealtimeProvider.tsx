/**
 * components/realtime/UserRealtimeProvider.tsx
 * Authenticated user realtime provider context.
 * Mounts in layout, subscribes to user notifications, and passes down context.
 */

"use client";

import React, { createContext, useContext } from "react";
import { useNotificationsRealtime } from "@/hooks/realtime/use-notifications-realtime";
import type { RealtimeConnectionState } from "@/lib/realtime/types";
import type { Database } from "@/types/database";

type NotificationRow = Database["public"]["Tables"]["notifications"]["Row"];

interface UserRealtimeContextValue {
  notifications: NotificationRow[];
  unreadCount: number;
  connectionState: RealtimeConnectionState;
  refetch: () => Promise<void> | void;
}

const UserRealtimeContext = createContext<UserRealtimeContextValue | null>(null);

export function UserRealtimeProvider({
  userId,
  children,
}: {
  userId: string;
  children: React.ReactNode;
}) {
  const realtime = useNotificationsRealtime(userId);

  return (
    <UserRealtimeContext.Provider value={realtime}>
      {children}
    </UserRealtimeContext.Provider>
  );
}

export function useUserRealtime() {
  const ctx = useContext(UserRealtimeContext);
  if (!ctx) {
    throw new Error("useUserRealtime must be used inside UserRealtimeProvider");
  }
  return ctx;
}
