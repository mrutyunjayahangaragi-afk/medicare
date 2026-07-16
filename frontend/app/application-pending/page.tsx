import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Application Pending — Medicare",
  description: "Your application is being reviewed",
};

async function signOut() {
  "use server";
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export default async function ApplicationPendingPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch the user's pending application
  const { data: application } = await supabase
    .from("portal_applications")
    .select("application_type, status, created_at")
    .eq("user_id", user.id)
    .eq("status", "pending")
    .single();

  // If no pending application, redirect to dashboard
  if (!application) {
    redirect("/dashboard");
  }

  const applicationTypeLabel = application.application_type === "hospital" ? "Hospital" : "Responder";

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50/60 via-white to-rose-50/40 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_40px_rgba(15,23,42,0.08)] px-8 py-10">
          {/* Success Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-amber-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>

          {/* Heading */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-black text-slate-900 leading-tight mb-2">
              Application Submitted
            </h1>
            <p className="text-sm text-slate-500 leading-relaxed">
              Your application is being reviewed. You will receive access after administrator approval.
            </p>
          </div>

          {/* Application Type Badge */}
          <div className="flex justify-center mb-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg font-medium text-sm">
              <span>{applicationTypeLabel} Application</span>
            </div>
          </div>

          {/* Info Cards */}
          <div className="space-y-3 mb-6">
            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-sm text-slate-600">
                <span className="font-semibold text-slate-900">Application Type:</span>{" "}
                {applicationTypeLabel}
              </p>
              <p className="text-sm text-slate-600 mt-1">
                <span className="font-semibold text-slate-900">Status:</span>{" "}
                <span className="text-amber-600">Pending Review</span>
              </p>
              <p className="text-sm text-slate-600 mt-1">
                <span className="font-semibold text-slate-900">Submitted:</span>{" "}
                {new Date(application.created_at).toLocaleDateString()}
              </p>
            </div>

            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <span className="font-semibold">What happens next?</span>
              </p>
              <p className="text-sm text-blue-700 mt-1">
                Our team will review your application and contact you if additional information is needed. This process typically takes 1-3 business days.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3">
            <Link
              href="/"
              className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-[#E53935] hover:bg-[#C62828] text-white text-sm font-bold rounded-xl shadow-sm shadow-red-200 transition-colors duration-150 cursor-pointer text-center"
            >
              Return to Home
            </Link>
            <form action={signOut}>
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-white border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-800 text-sm font-bold rounded-xl transition-colors duration-150 cursor-pointer"
              >
                Sign Out
              </button>
            </form>
          </div>
        </div>

        {/* Back link */}
        <p className="text-center text-xs text-slate-400 mt-5">
          <Link href="/login" className="hover:text-slate-600 transition-colors">
            ← Back to Login
          </Link>
        </p>
      </div>
    </div>
  );
}
