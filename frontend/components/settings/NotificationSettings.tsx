"use client";

import { useState, useEffect } from "react";
import { Bell, Volume2, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { fetchNotificationPreferences, updateNotificationPreferences } from "@/lib/settings";

export default function NotificationSettings() {
  const { toast } = useToast();
  const [preferences, setPreferences] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadPreferences = async () => {
    setIsLoading(true);
    try {
      const data = await fetchNotificationPreferences();
      setPreferences(data);
    } catch (error) {
      console.error("Failed to load notification preferences:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPreferences();
  }, []);

  const handleToggle = async (key: string, value: boolean) => {
    if (!preferences) return;

    setPreferences({ ...preferences, [key]: value });
    setIsSaving(true);

    try {
      const { error } = await updateNotificationPreferences({ [key]: value });
      if (error) {
        toast(error, "error");
        // Revert on error
        setPreferences({ ...preferences, [key]: !value });
        return;
      }
      toast("Notification preferences updated!", "success");
    } catch (error) {
      console.error("Failed to update notification preferences:", error);
      toast("Failed to update preferences. Please try again.", "error");
      setPreferences({ ...preferences, [key]: !value });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
      </div>
    );
  }

  if (!preferences) {
    return (
      <div className="text-center py-8 text-slate-500">
        Failed to load notification preferences
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between py-3 border-b border-slate-100">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Bell className="w-4 h-4 text-slate-500" />
            <span className="text-sm font-medium text-slate-900">Emergency Status Updates</span>
          </div>
          <p className="text-xs text-slate-500">Get notified when your emergency request status changes</p>
        </div>
        <button
          onClick={() => handleToggle("emergency_updates", !preferences.emergency_updates)}
          disabled={isSaving}
          className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer disabled:cursor-not-allowed ${
            preferences.emergency_updates ? "bg-blue-600" : "bg-slate-200"
          }`}
          aria-label="Toggle emergency status updates"
        >
          <span
            className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
              preferences.emergency_updates ? "left-7" : "left-1"
            }`}
          />
        </button>
      </div>

      <div className="flex items-center justify-between py-3 border-b border-slate-100">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Bell className="w-4 h-4 text-slate-500" />
            <span className="text-sm font-medium text-slate-900">Responder Arrival Alerts</span>
          </div>
          <p className="text-xs text-slate-500">Get notified when a responder is nearby or arrives</p>
        </div>
        <button
          onClick={() => handleToggle("responder_arrival", !preferences.responder_arrival)}
          disabled={isSaving}
          className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer disabled:cursor-not-allowed ${
            preferences.responder_arrival ? "bg-blue-600" : "bg-slate-200"
          }`}
          aria-label="Toggle responder arrival alerts"
        >
          <span
            className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
              preferences.responder_arrival ? "left-7" : "left-1"
            }`}
          />
        </button>
      </div>

      <div className="flex items-center justify-between py-3 border-b border-slate-100">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Bell className="w-4 h-4 text-slate-500" />
            <span className="text-sm font-medium text-slate-900">New Message Alerts</span>
          </div>
          <p className="text-xs text-slate-500">Get notified when you receive new messages</p>
        </div>
        <button
          onClick={() => handleToggle("new_messages", !preferences.new_messages)}
          disabled={isSaving}
          className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer disabled:cursor-not-allowed ${
            preferences.new_messages ? "bg-blue-600" : "bg-slate-200"
          }`}
          aria-label="Toggle new message alerts"
        >
          <span
            className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
              preferences.new_messages ? "left-7" : "left-1"
            }`}
          />
        </button>
      </div>

      <div className="flex items-center justify-between py-3 border-b border-slate-100">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Bell className="w-4 h-4 text-slate-500" />
            <span className="text-sm font-medium text-slate-900">Request Completion Alerts</span>
          </div>
          <p className="text-xs text-slate-500">Get notified when your emergency request is completed</p>
        </div>
        <button
          onClick={() => handleToggle("request_completion", !preferences.request_completion)}
          disabled={isSaving}
          className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer disabled:cursor-not-allowed ${
            preferences.request_completion ? "bg-blue-600" : "bg-slate-200"
          }`}
          aria-label="Toggle request completion alerts"
        >
          <span
            className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
              preferences.request_completion ? "left-7" : "left-1"
            }`}
          />
        </button>
      </div>

      <div className="flex items-center justify-between py-3 border-b border-slate-100">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Bell className="w-4 h-4 text-slate-500" />
            <span className="text-sm font-medium text-slate-900">Browser Notifications</span>
          </div>
          <p className="text-xs text-slate-500">Enable browser push notifications</p>
        </div>
        <button
          onClick={() => handleToggle("browser_notifications", !preferences.browser_notifications)}
          disabled={isSaving}
          className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer disabled:cursor-not-allowed ${
            preferences.browser_notifications ? "bg-blue-600" : "bg-slate-200"
          }`}
          aria-label="Toggle browser notifications"
        >
          <span
            className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
              preferences.browser_notifications ? "left-7" : "left-1"
            }`}
          />
        </button>
      </div>

      <div className="flex items-center justify-between py-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Volume2 className="w-4 h-4 text-slate-500" />
            <span className="text-sm font-medium text-slate-900">Sound Alerts</span>
          </div>
          <p className="text-xs text-slate-500">Play sound for notifications</p>
        </div>
        <button
          onClick={() => handleToggle("sound_enabled", !preferences.sound_enabled)}
          disabled={isSaving}
          className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer disabled:cursor-not-allowed ${
            preferences.sound_enabled ? "bg-blue-600" : "bg-slate-200"
          }`}
          aria-label="Toggle sound alerts"
        >
          <span
            className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
              preferences.sound_enabled ? "left-7" : "left-1"
            }`}
          />
        </button>
      </div>
    </div>
  );
}
