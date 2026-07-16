"use client";

import { useState, useEffect } from "react";
import { Sun, Moon, Monitor, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { fetchUserSettings, updateUserSettings } from "@/lib/settings";

export default function AppearanceSettings() {
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
      console.error("Failed to load appearance settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleThemeChange = async (theme: "light" | "dark" | "system") => {
    if (!settings) return;

    setSettings({ ...settings, theme });
    setIsSaving(true);

    try {
      const { error } = await updateUserSettings({ theme });
      if (error) {
        toast(error, "error");
        setSettings({ ...settings, theme: settings.theme });
        return;
      }
      toast("Theme preference updated!", "success");
    } catch (error) {
      console.error("Failed to update theme preference:", error);
      toast("Failed to update theme. Please try again.", "error");
      setSettings({ ...settings, theme: settings.theme });
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
        Failed to load appearance settings
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
        <p className="text-xs text-slate-600 mb-4">
          Theme support is not yet implemented. This setting is saved for future use.
        </p>
        
        <div className="space-y-3">
          <button
            onClick={() => handleThemeChange("light")}
            disabled={isSaving}
            className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all cursor-pointer disabled:cursor-not-allowed ${
              settings.theme === "light"
                ? "border-blue-600 bg-blue-50"
                : "border-slate-200 hover:border-slate-300 bg-white"
            }`}
          >
            <Sun className="w-5 h-5 text-slate-600" />
            <span className="text-sm font-medium text-slate-900">Light</span>
          </button>

          <button
            onClick={() => handleThemeChange("dark")}
            disabled={isSaving}
            className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all cursor-pointer disabled:cursor-not-allowed ${
              settings.theme === "dark"
                ? "border-blue-600 bg-blue-50"
                : "border-slate-200 hover:border-slate-300 bg-white"
            }`}
          >
            <Moon className="w-5 h-5 text-slate-600" />
            <span className="text-sm font-medium text-slate-900">Dark</span>
          </button>

          <button
            onClick={() => handleThemeChange("system")}
            disabled={isSaving}
            className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all cursor-pointer disabled:cursor-not-allowed ${
              settings.theme === "system"
                ? "border-blue-600 bg-blue-50"
                : "border-slate-200 hover:border-slate-300 bg-white"
            }`}
          >
            <Monitor className="w-5 h-5 text-slate-600" />
            <span className="text-sm font-medium text-slate-900">System</span>
          </button>
        </div>
      </div>
    </div>
  );
}
