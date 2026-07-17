import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database";

export async function fetchNotifications(limit?: number) {
  const supabase = createClient();
  const query = supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false });

  if (limit) {
    query.limit(limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[notifications] fetch:", error);
    return [];
  }

  return (data || []) as Database["public"]["Tables"]["notifications"]["Row"][];
}

export async function fetchUnreadNotifications() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("is_read", false)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[notifications] fetch unread:", error);
    return [];
  }

  return (data || []) as Database["public"]["Tables"]["notifications"]["Row"][];
}

export async function getUnreadNotificationCount() {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_unread_notification_count");

  if (error) {
    console.error("[notifications] get unread count:", error);
    return 0;
  }

  return data || 0;
}

export async function markNotificationAsRead(notificationId: string) {
  const supabase = createClient();
  const { error } = await supabase.rpc("mark_notification_read", {
    p_notification_id: notificationId,
  });

  if (error) {
    console.error("[notifications] mark as read:", error);
    throw error;
  }
}

export async function markAllNotificationsAsRead() {
  const supabase = createClient();
  const { error } = await supabase.rpc("mark_all_notifications_read");

  if (error) {
    console.error("[notifications] mark all as read:", error);
    throw error;
  }
}

export function subscribeToNotifications(
  onNewNotification: (notification: Database["public"]["Tables"]["notifications"]["Row"]) => void,
  onNotificationUpdate: (notification: Database["public"]["Tables"]["notifications"]["Row"]) => void
) {
  const supabase = createClient();
  const channel = supabase
    .channel("notifications_changes")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "notifications",
      },
      (payload) => {
        if (payload.eventType === "INSERT") {
          onNewNotification(payload.new as Database["public"]["Tables"]["notifications"]["Row"]);
        } else if (payload.eventType === "UPDATE") {
          onNotificationUpdate(payload.new as Database["public"]["Tables"]["notifications"]["Row"]);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
