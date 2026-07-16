"use client";

import { useState, useEffect } from "react";
import { MapPin, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { fetchUserSettings, updateUserSettings } from "@/lib/settings";

export default function LocationSettings() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const data = await fetchUserSettings();
      setSettings(data);
    } catch (error) {
      console.error("Failed to load location settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleToggle = async (key: string, value: boolean) => {
    if (!settings) return;

    setSettings({ ...settings, [key]: value });
    setIsSaving(true);

    try {
      const { error } = await updateUserSettings({ [key]: value });
      if (error) {
        toast(error, "error");
        setSettings({ ...settings, [key]: !value });
        return;
      }
      toast("Location settings updated!", "success");
    } catch (error) {
      console.error("Failed to update location settings:", error);
      toast("Failed to update settings. Please try again.", "error");
      setSettings({ ...settings, [key]: !value });
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

  if (!settings) {
    return (
      <div className="text-center py-8 text-slate-500">
        Failed to load location settings
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between py-3 border-b border-slate-100">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <MapPin className="w-4 h-4 text-slate-500" />
            <span className="text-sm font-medium text-slate-900">Allow Location Sharing</span>
          </div>
          <p className="text-xs text-slate-500">Share your location with responders during active emergencies</p>
        </div>
        <button
          onClick={() => handleToggle("allow_location_sharing", !settings.allow_location_sharing)}
          disabled={isSaving}
          className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer disabled:cursor-not-allowed ${
            settings.allow_location_sharing ? "bg-blue-600" : "bg-slate-200"
          }`}
          aria-label="Toggle location sharing"
        >
          <span
            className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
              settings.allow_location_sharing ? "left-7" : "left-1"
            }`}
          />
        </button>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <p className="text-xs text-amber-800">
          <strong>Note:</strong> Location sharing is only active during emergency requests. Your location is not tracked continuously.
        </p>
      </div>
    </div>
  );
}
