import { createClient } from "@/lib/supabase/client";
import type { UserSettings } from "@/types/database";

export async function fetchUserSettings(): Promise<UserSettings | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // No settings found, return defaults
      return {
        user_id: user.id,
        share_medical_details: true,
        share_phone_with_responder: true,
        allow_location_sharing: true,
        notify_emergency_contacts: true,
        use_high_accuracy_location: true,
        remember_manual_address: false,
        theme: "system",
        updated_at: new Date().toISOString(),
      };
    }
    console.error("[settings] fetch error:", error.code);
    return null;
  }
  return data as UserSettings;
}

export async function updateUserSettings(
  settings: Partial<Omit<UserSettings, "user_id" | "updated_at">>
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { error: "You must be authenticated to update settings" };
  }

  // Check if settings exist, if not create them
  const { data: existing } = await supabase
    .from("user_settings")
    .select("user_id")
    .eq("user_id", user.id)
    .single();

  let error;
  if (existing) {
    const { error: updateError } = await supabase
      .from("user_settings")
      .update({ ...settings, updated_at: new Date().toISOString() })
      .eq("user_id", user.id);
    error = updateError;
  } else {
    const { error: insertError } = await supabase
      .from("user_settings")
      .insert({
        user_id: user.id,
        ...settings,
        updated_at: new Date().toISOString(),
      });
    error = insertError;
  }

  if (error) {
    console.error("[settings] update error:", error.code);
    return { error: "Failed to update settings. Please try again." };
  }
  return { error: null };
}

export async function fetchNotificationPreferences() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // No preferences found, return defaults
      return {
        user_id: user.id,
        emergency_updates: true,
        responder_arrival: true,
        new_messages: true,
        request_completion: true,
        browser_notifications: false,
        sound_enabled: true,
        updated_at: new Date().toISOString(),
      };
    }
    console.error("[settings] fetch notification preferences error:", error.code);
    return null;
  }
  return data;
}

export async function updateNotificationPreferences(
  preferences: {
    emergency_updates?: boolean;
    responder_arrival?: boolean;
    new_messages?: boolean;
    request_completion?: boolean;
    browser_notifications?: boolean;
    sound_enabled?: boolean;
  }
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { error: "You must be authenticated to update preferences" };
  }

  // Check if preferences exist, if not create them
  const { data: existing } = await supabase
    .from("notification_preferences")
    .select("user_id")
    .eq("user_id", user.id)
    .single();

  let error;
  if (existing) {
    const { error: updateError } = await supabase
      .from("notification_preferences")
      .update({ ...preferences, updated_at: new Date().toISOString() })
      .eq("user_id", user.id);
    error = updateError;
  } else {
    const { error: insertError } = await supabase
      .from("notification_preferences")
      .insert({
        user_id: user.id,
        ...preferences,
        updated_at: new Date().toISOString(),
      });
    error = insertError;
  }

  if (error) {
    console.error("[settings] update notification preferences error:", error.code);
    return { error: "Failed to update preferences. Please try again." };
  }
  return { error: null };
}
