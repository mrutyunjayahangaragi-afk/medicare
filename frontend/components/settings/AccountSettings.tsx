"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { User, Mail, Calendar, LogOut, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import PasswordResetCard from "@/components/settings/PasswordResetCard";

export default function AccountSettings() {
  const router = useRouter();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const loadUser = async () => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    } catch (error) {
      console.error("Failed to load user:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUser();
  }, []);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.replace("/login");
      router.refresh();
    } catch (error) {
      console.error("Failed to logout:", error);
      toast("Failed to logout. Please try again.", "error");
      setIsLoggingOut(false);
    }
  };

  const isGoogleUser = user?.app_metadata?.provider === "google";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-8 text-slate-500">
        Failed to load account information
      </div>
    );
  }

  const formattedDate = user.created_at
    ? new Date(user.created_at).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "—";

  return (
    <div className="space-y-6">
      {/* Account Information */}
      <div className="space-y-4">
        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Account Information
        </h4>

        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <User className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-slate-500">Email</p>
              <p className="text-sm font-medium text-slate-900">{user.email}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Mail className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-slate-500">Authentication Provider</p>
              <p className="text-sm font-medium text-slate-900 capitalize">
                {isGoogleUser ? "Google" : "Email & Password"}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Calendar className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-slate-500">Account Created</p>
              <p className="text-sm font-medium text-slate-900">{formattedDate}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Password Reset */}
      {!isGoogleUser && (
        <div className="space-y-4">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Password
          </h4>
          <PasswordResetCard email={user.email || ""} />
        </div>
      )}

      {isGoogleUser && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            Your account uses Google authentication. Password management is handled through your Google account settings.
          </p>
        </div>
      )}

      {/* Logout */}
      <div className="pt-4 border-t border-slate-200">
        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="w-full flex items-center justify-center gap-2 py-3 bg-red-50 hover:bg-red-100 text-red-700 text-sm font-bold rounded-xl transition-colors cursor-pointer disabled:cursor-not-allowed"
        >
          {isLoggingOut ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Signing out...
            </>
          ) : (
            <>
              <LogOut className="w-4 h-4" />
              Sign Out
            </>
          )}
        </button>
      </div>
    </div>
  );
}
