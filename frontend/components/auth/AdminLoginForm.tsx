"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import AuthLayout from "./AuthLayout";

export default function AdminLoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      
      // Sign in with email and password
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        console.error("[ADMIN AUTH] Sign in error:", signInError);
        setError(signInError.message || "Authentication failed");
        setLoading(false);
        return;
      }

      if (!data.user) {
        setError("Authentication failed. Please try again.");
        setLoading(false);
        return;
      }

      // Check user's profile role
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();

      if (profileError || !profile) {
        console.error("[ADMIN AUTH] Profile fetch error:", profileError);
        setError("Failed to verify admin access. Please contact support.");
        setLoading(false);
        return;
      }

      // Redirect based on role
      if (profile.role === "admin") {
        router.push("/admin");
        router.refresh();
      } else if (profile.role === "hospital") {
        router.push("/hospital");
        router.refresh();
      } else if (profile.role === "responder") {
        router.push("/responder");
        router.refresh();
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch (err) {
      console.error("[ADMIN AUTH] Unexpected error:", err);
      setError("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <AuthLayout variant="login">
      <div className="w-full">
        {/* Heading */}
        <div className="mb-8">
          <h1 className="text-3xl font-black text-slate-900 leading-tight mb-2">
            Medicare Admin Portal
          </h1>
          <p className="text-base text-slate-500 leading-relaxed">
            Sign in to access the admin dashboard
          </p>
        </div>

        {/* Error banner */}
        {error && (
          <div
            role="alert"
            className="mb-6 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 font-medium"
          >
            {error}
          </div>
        )}

        {/* Login form */}
        <form onSubmit={handleLogin} className="space-y-4">
          {/* Email field */}
          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-2">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
              placeholder="admin@medicare.com"
            />
          </div>

          {/* Password field */}
          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-slate-700 mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
              placeholder="••••••••"
            />
          </div>

          {/* Sign in button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-5 py-3.5 bg-[#4285F4] hover:bg-[#3367D6] disabled:opacity-60 disabled:cursor-not-allowed rounded-xl text-sm font-bold text-white transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4285F4]/50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4.5 h-4.5 animate-spin" />
                <span>Signing in...</span>
              </>
            ) : (
              <span>Sign In</span>
            )}
          </button>
        </form>

        {/* Trust indicators */}
        <div className="flex items-center justify-center gap-1.5 mt-6 text-xs text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-green-500 flex-shrink-0" aria-hidden="true" />
          <span>Secured by Supabase · Admin Access Only</span>
        </div>

        {/* Back to normal login */}
        <p className="text-center text-sm text-slate-600 mt-6">
          Need regular user access?{" "}
          <a href="/login" className="text-red-500 font-semibold hover:underline">
            Go to normal login
          </a>
        </p>
      </div>
    </AuthLayout>
  );
}
