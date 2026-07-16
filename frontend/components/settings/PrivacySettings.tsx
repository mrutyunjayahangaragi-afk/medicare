"use client";

import { useState, useEffect } from "react";
import { Shield, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { fetchUserSettings, updateUserSettings } from "@/lib/settings";

export default function PrivacySettings() {
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
      console.error("Failed to load privacy settings:", error);
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
      toast("Privacy settings updated!", "success");
    } catch (error) {
      console.error("Failed to update privacy settings:", error);
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
        Failed to load privacy settings
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between py-3 border-b border-slate-100">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-4 h-4 text-slate-500" />
            <span className="text-sm font-medium text-slate-900">Share Medical Details with Responder</span>
          </div>
          <p className="text-xs text-slate-500">Allow assigned responders to view your medical information</p>
        </div>
        <button
          onClick={() => handleToggle("share_medical_details", !settings.share_medical_details)}
          disabled={isSaving}
          className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer disabled:cursor-not-allowed ${
            settings.share_medical_details ? "bg-blue-600" : "bg-slate-200"
          }`}
          aria-label="Toggle share medical details"
        >
          <span
            className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
              settings.share_medical_details ? "left-7" : "left-1"
            }`}
          />
        </button>
      </div>

      <div className="flex items-center justify-between py-3 border-b border-slate-100">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-4 h-4 text-slate-500" />
            <span className="text-sm font-medium text-slate-900">Share Phone with Responder</span>
          </div>
          <p className="text-xs text-slate-500">Allow assigned responders to see your phone number</p>
        </div>
        <button
          onClick={() => handleToggle("share_phone_with_responder", !settings.share_phone_with_responder)}
          disabled={isSaving}
          className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer disabled:cursor-not-allowed ${
            settings.share_phone_with_responder ? "bg-blue-600" : "bg-slate-200"
          }`}
          aria-label="Toggle share phone with responder"
        >
          <span
            className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
              settings.share_phone_with_responder ? "left-7" : "left-1"
            }`}
          />
        </button>
      </div>

      <div className="flex items-center justify-between py-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-4 h-4 text-slate-500" />
            <span className="text-sm font-medium text-slate-900">Notify Emergency Contacts</span>
          </div>
          <p className="text-xs text-slate-500">Allow emergency contacts to be notified during emergencies</p>
        </div>
        <button
          onClick={() => handleToggle("notify_emergency_contacts", !settings.notify_emergency_contacts)}
          disabled={isSaving}
          className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer disabled:cursor-not-allowed ${
            settings.notify_emergency_contacts ? "bg-blue-600" : "bg-slate-200"
          }`}
          aria-label="Toggle notify emergency contacts"
        >
          <span
            className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
              settings.notify_emergency_contacts ? "left-7" : "left-1"
            }`}
          />
        </button>
      </div>
    </div>
  );
}
