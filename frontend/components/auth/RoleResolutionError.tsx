"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, RefreshCw, LogOut, Home } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface RoleResolutionErrorProps {
  error?: string;
  onRetry?: () => void;
}

export default function RoleResolutionError({ error, onRetry }: RoleResolutionErrorProps) {
  const router = useRouter();
  const [isRetrying, setIsRetrying] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleRetry = async () => {
    if (isRetrying) return;
    setIsRetrying(true);
    
    try {
      if (onRetry) {
        await onRetry();
      } else {
        // Default retry: reload the page
        router.refresh();
      }
    } catch {
      // If retry fails, show error state
    } finally {
      setIsRetrying(false);
    }
  };

  const handleSignOut = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.replace("/login");
      router.refresh();
    } catch {
      setIsSigningOut(false);
    }
  };

  const handleGoHome = () => {
    router.replace("/");
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8">
          {/* Error Icon */}
          <div className="flex items-center justify-center w-16 h-16 bg-red-50 border border-red-100 rounded-2xl mx-auto mb-6">
            <AlertTriangle className="w-8 h-8 text-red-500" aria-hidden="true" />
          </div>

          {/* Heading */}
          <h1 className="text-2xl font-black text-slate-900 text-center mb-2">
            Unable to Verify Account Role
          </h1>
          
          {/* Error Message */}
          <p className="text-sm text-slate-500 text-center leading-relaxed mb-6">
            {error || "We couldn't determine your account role. This may be due to a temporary issue or missing profile information."}
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={handleRetry}
              disabled={isRetrying}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl shadow-sm shadow-blue-200 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              aria-label="Retry role resolution"
            >
              {isRetrying ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Retrying...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Retry
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed text-slate-700 text-sm font-semibold rounded-xl transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
              aria-label="Sign out and return to login"
            >
              {isSigningOut ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Signing out...
                </>
              ) : (
                <>
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleGoHome}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 text-slate-500 text-sm font-semibold hover:text-slate-700 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
              aria-label="Go to home page"
            >
              <Home className="w-4 h-4" />
              Back to Home
            </button>
          </div>

          {/* Help Text */}
          <p className="text-xs text-slate-400 text-center mt-6 leading-relaxed">
            If this problem persists, please contact support for assistance.
          </p>
        </div>
      </div>
    </div>
  );
}
