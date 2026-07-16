"use client";

import { useState } from "react";
import { Key, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/Toast";

interface PasswordResetCardProps {
  email: string;
}

export default function PasswordResetCard({ email }: PasswordResetCardProps) {
  const { toast } = useToast();
  const [isSending, setIsSending] = useState(false);

  const handleSendReset = async () => {
    setIsSending(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) {
        toast("Failed to send password reset email. Please try again.", "error");
        return;
      }

      toast("Password reset email sent successfully! Check your inbox.", "success");
    } catch (error) {
      console.error("Failed to send password reset:", error);
      toast("Failed to send password reset email. Please try again.", "error");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
      <div className="flex items-start gap-3 mb-3">
        <Key className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-900 mb-1">
            Reset Password
          </p>
          <p className="text-xs text-slate-600">
            Send a password reset link to your email
          </p>
        </div>
      </div>
      <button
        onClick={handleSendReset}
        disabled={isSending}
        className="w-full py-2 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
      >
        {isSending ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
            Sending...
          </>
        ) : (
          "Send Password Reset Email"
        )}
      </button>
    </div>
  );
}
