"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Bell, MapPin, Moon, Shield, Smartphone, LogOut, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function ResponderSettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState({
    notifications_enabled: true,
    location_sharing_enabled: true,
    dark_mode: false,
    emergency_alerts: true,
    message_notifications: true,
    assignment_notifications: true,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push("/login");
        return;
      }

      const { data: profileData } = await supabase
        .from("profiles")
        .select("notification_preferences")
        .eq("id", user.id)
        .single();

      if (profileData && profileData.notification_preferences) {
        setSettings({
          ...settings,
          ...profileData.notification_preferences,
        });
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSettingChange = (key: string, value: boolean) => {
    setSettings({ ...settings, [key]: value });
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      const { error } = await supabase
        .from("profiles")
        .update({
          notification_preferences: settings,
        })
        .eq("id", user.id);

      if (error) throw error;

      alert("Settings saved successfully");
    } catch (error) {
      console.error("Failed to save settings:", error);
      alert("Failed to save settings. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-12 bg-slate-200 rounded-xl" />
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-20 bg-slate-200 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center gap-3 mb-8"
        >
          <button
            onClick={() => router.push("/responder")}
            className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
            aria-label="Go back to dashboard"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Settings</h1>
            <p className="text-slate-600">Manage your responder preferences and notifications</p>
          </div>
        </motion.div>

        {/* Notifications Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="bg-white border border-slate-200 rounded-2xl p-6 mb-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Bell className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">Notifications</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-slate-100">
              <div>
                <p className="font-medium text-slate-900">Enable Notifications</p>
                <p className="text-sm text-slate-500">Receive push notifications for emergencies</p>
              </div>
              <button
                onClick={() => handleSettingChange("notifications_enabled", !settings.notifications_enabled)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  settings.notifications_enabled ? "bg-blue-500" : "bg-slate-300"
                }`}
              >
                <span
                  className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    settings.notifications_enabled ? "translate-x-6" : ""
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between py-3 border-b border-slate-100">
              <div>
                <p className="font-medium text-slate-900">Emergency Alerts</p>
                <p className="text-sm text-slate-500">Critical emergency notifications</p>
              </div>
              <button
                onClick={() => handleSettingChange("emergency_alerts", !settings.emergency_alerts)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  settings.emergency_alerts ? "bg-blue-500" : "bg-slate-300"
                }`}
              >
                <span
                  className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    settings.emergency_alerts ? "translate-x-6" : ""
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between py-3 border-b border-slate-100">
              <div>
                <p className="font-medium text-slate-900">Message Notifications</p>
                <p className="text-sm text-slate-500">New message alerts from patients</p>
              </div>
              <button
                onClick={() => handleSettingChange("message_notifications", !settings.message_notifications)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  settings.message_notifications ? "bg-blue-500" : "bg-slate-300"
                }`}
              >
                <span
                  className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    settings.message_notifications ? "translate-x-6" : ""
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium text-slate-900">Assignment Notifications</p>
                <p className="text-sm text-slate-500">New emergency request assignments</p>
              </div>
              <button
                onClick={() => handleSettingChange("assignment_notifications", !settings.assignment_notifications)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  settings.assignment_notifications ? "bg-blue-500" : "bg-slate-300"
                }`}
              >
                <span
                  className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    settings.assignment_notifications ? "translate-x-6" : ""
                  }`}
                />
              </button>
            </div>
          </div>
        </motion.div>

        {/* Location Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="bg-white border border-slate-200 rounded-2xl p-6 mb-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <MapPin className="w-5 h-5 text-emerald-600" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">Location Sharing</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium text-slate-900">Share Location During Response</p>
                <p className="text-sm text-slate-500">Allow patients to track your location during active responses</p>
              </div>
              <button
                onClick={() => handleSettingChange("location_sharing_enabled", !settings.location_sharing_enabled)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  settings.location_sharing_enabled ? "bg-blue-500" : "bg-slate-300"
                }`}
              >
                <span
                  className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    settings.location_sharing_enabled ? "translate-x-6" : ""
                  }`}
                />
              </button>
            </div>
          </div>
        </motion.div>

        {/* Appearance Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          className="bg-white border border-slate-200 rounded-2xl p-6 mb-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Moon className="w-5 h-5 text-purple-600" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">Appearance</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium text-slate-900">Dark Mode</p>
                <p className="text-sm text-slate-500">Use dark theme for the interface</p>
              </div>
              <button
                onClick={() => handleSettingChange("dark_mode", !settings.dark_mode)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  settings.dark_mode ? "bg-blue-500" : "bg-slate-300"
                }`}
              >
                <span
                  className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    settings.dark_mode ? "translate-x-6" : ""
                  }`}
                />
              </button>
            </div>
          </div>
        </motion.div>

        {/* Account Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
          className="bg-white border border-slate-200 rounded-2xl p-6 mb-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-red-600" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">Account</h2>
          </div>

          <div className="space-y-4">
            <button
              onClick={() => router.push("/responder/profile")}
              className="w-full flex items-center justify-between py-3 px-4 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-slate-600" />
                <span className="font-medium text-slate-900">Edit Profile</span>
              </div>
              <ArrowLeft className="w-5 h-5 text-slate-400 rotate-180" />
            </button>

            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-between py-3 px-4 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-3">
                <LogOut className="w-5 h-5 text-red-600" />
                <span className="font-medium text-red-600">Logout</span>
              </div>
              <ArrowLeft className="w-5 h-5 text-red-400 rotate-180" />
            </button>
          </div>
        </motion.div>

        {/* Save Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.5 }}
          className="flex justify-end"
        >
          <button
            onClick={handleSaveSettings}
            disabled={isSaving}
            className="px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-300 text-white font-semibold rounded-xl transition-colors"
          >
            {isSaving ? "Saving..." : "Save Settings"}
          </button>
        </motion.div>
      </div>
    </div>
  );
}
