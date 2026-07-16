"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Settings, Bell, Shield, MapPin, Sun, User, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import NotificationSettings from "@/components/settings/NotificationSettings";
import PrivacySettings from "@/components/settings/PrivacySettings";
import LocationSettings from "@/components/settings/LocationSettings";
import AppearanceSettings from "@/components/settings/AppearanceSettings";
import AccountSettings from "@/components/settings/AccountSettings";
import AccountDeletionDialog from "@/components/settings/AccountDeletionDialog";

type Tab = "notifications" | "privacy" | "location" | "appearance" | "account";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "notifications", label: "Notifications", icon: <Bell className="w-4 h-4" /> },
  { id: "privacy", label: "Privacy", icon: <Shield className="w-4 h-4" /> },
  { id: "location", label: "Location", icon: <MapPin className="w-4 h-4" /> },
  { id: "appearance", label: "Appearance", icon: <Sun className="w-4 h-4" /> },
  { id: "account", label: "Account", icon: <User className="w-4 h-4" /> },
];

export default function SettingsPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>("notifications");
  const [isDeletionDialogOpen, setIsDeletionDialogOpen] = useState(false);

  const handleAccountDeletion = async () => {
    // This is a placeholder for the actual deletion flow
    // In a real implementation, this would create a deletion request
    toast("Account deletion request submitted. You will receive further instructions via email.", "success");
  };

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
          <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
            <Settings className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
              Settings
            </h1>
            <p className="text-slate-600">
              Manage your preferences and account
            </p>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Sidebar Navigation */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="md:col-span-1"
          >
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors cursor-pointer ${
                    activeTab === tab.id
                      ? "bg-blue-50 text-blue-700 border-l-4 border-blue-600"
                      : "text-slate-600 hover:bg-slate-50 border-l-4 border-transparent"
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>
          </motion.div>

          {/* Settings Content */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="md:col-span-3"
          >
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
              {activeTab === "notifications" && (
                <div>
                  <h2 className="text-lg font-bold text-slate-900 mb-6">Notification Settings</h2>
                  <NotificationSettings />
                </div>
              )}

              {activeTab === "privacy" && (
                <div>
                  <h2 className="text-lg font-bold text-slate-900 mb-6">Privacy Settings</h2>
                  <PrivacySettings />
                </div>
              )}

              {activeTab === "location" && (
                <div>
                  <h2 className="text-lg font-bold text-slate-900 mb-6">Location Settings</h2>
                  <LocationSettings />
                </div>
              )}

              {activeTab === "appearance" && (
                <div>
                  <h2 className="text-lg font-bold text-slate-900 mb-6">Appearance Settings</h2>
                  <AppearanceSettings />
                </div>
              )}

              {activeTab === "account" && (
                <div>
                  <h2 className="text-lg font-bold text-slate-900 mb-6">Account Settings</h2>
                  <AccountSettings />
                  
                  <div className="mt-8 pt-6 border-t border-slate-200">
                    <h3 className="text-sm font-bold text-red-600 mb-4">Danger Zone</h3>
                    <button
                      onClick={() => setIsDeletionDialogOpen(true)}
                      className="w-full py-3 bg-red-50 hover:bg-red-100 text-red-700 text-sm font-bold rounded-xl transition-colors cursor-pointer"
                    >
                      Request Account Deletion
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Account Deletion Dialog */}
        <AccountDeletionDialog
          isOpen={isDeletionDialogOpen}
          onClose={() => setIsDeletionDialogOpen(false)}
          onConfirm={handleAccountDeletion}
        />
      </div>
    </div>
  );
}
