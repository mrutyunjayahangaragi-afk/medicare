import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Unauthorized — Medicare",
  description: "You do not have permission to access this portal",
};

async function signOut() {
  "use server";
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export default async function UnauthorizedPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch user's profile to determine their valid portal
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  // Determine the user's valid dashboard
  let validDashboard = "/dashboard";
  if (profile) {
    switch (profile.role) {
      case "responder":
      case "volunteer":
        validDashboard = "/responder";
        break;
      case "hospital_staff":
        validDashboard = "/hospital";
        break;
      case "admin":
        validDashboard = "/admin";
        break;
      default:
        validDashboard = "/dashboard";
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50/60 via-white to-rose-50/40 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_40px_rgba(15,23,42,0.08)] px-8 py-10">
          {/* Error Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
          </div>

          {/* Heading */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-black text-slate-900 leading-tight mb-2">
              Access Denied
            </h1>
            <p className="text-sm text-slate-500 leading-relaxed">
              You do not have permission to access this portal. Please use the portal assigned to your account.
            </p>
          </div>

          {/* Info Card */}
          <div className="bg-slate-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-slate-600">
              <span className="font-semibold text-slate-900">Your Account:</span> {profile?.role || "user"}
            </p>
            <p className="text-sm text-slate-600 mt-1">
              <span className="font-semibold text-slate-900">Valid Portal:</span> {validDashboard}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3">
            <Link
              href={validDashboard}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-[#E53935] hover:bg-[#C62828] text-white text-sm font-bold rounded-xl shadow-sm shadow-red-200 transition-colors duration-150 cursor-pointer text-center"
            >
              Go to My Dashboard
            </Link>
            <Link
              href="/login"
              className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-white border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-800 text-sm font-bold rounded-xl transition-colors duration-150 cursor-pointer text-center"
            >
              Back to Login
            </Link>
            <form action={signOut}>
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-transparent text-slate-400 text-sm font-medium rounded-xl hover:text-slate-600 transition-colors duration-150 cursor-pointer"
              >
                Sign Out
              </button>
            </form>
          </div>
        </div>

        {/* Back link */}
        <p className="text-center text-xs text-slate-400 mt-5">
          <Link href="/" className="hover:text-slate-600 transition-colors">
            ← Back to Home
          </Link>
        </p>
      </div>
    </div>
  );
}
