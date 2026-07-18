import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Profile Error | Medicare",
  description: "Account profile could not be loaded",
};

export default async function ProfileErrorPage({
  searchParams,
}: {
  searchParams: { reason?: string };
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const reason = searchParams.reason || "unknown";

  // Get error message based on reason
  const getErrorMessage = (r: string) => {
    switch (r) {
      case "role_lookup_failed":
        return "Unable to verify your account role. This may be due to a database connection issue or missing profile data.";
      case "no_profile":
        return "No profile was found for your account. Your profile may not have been created properly during signup.";
      case "profile_error":
        return "Failed to load your account profile. There may be a temporary issue with our database.";
      case "rls_blocked":
        return "Access to your profile was blocked by security policies. Please contact support.";
      default:
        return "An unexpected error occurred while loading your account profile.";
    }
  };

  const errorMessage = getErrorMessage(reason);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          {/* Error Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
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

          {/* Error Message */}
          <h1 className="text-2xl font-bold text-slate-900 text-center mb-2">
            Profile Error
          </h1>
          <p className="text-slate-600 text-center mb-6">
            {errorMessage}
          </p>

          {/* Error Details */}
          <div className="bg-slate-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-slate-500">
              <span className="font-semibold">Error Code:</span> {reason}
            </p>
            {user && (
              <p className="text-sm text-slate-500 mt-1">
                <span className="font-semibold">Account:</span> {user.email}
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            {user ? (
              <>
                <Link
                  href="/dashboard"
                  className="block w-full bg-blue-600 text-white text-center py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  Retry
                </Link>
                <form
                  action={async () => {
                    "use server";
                    const supabase = await createClient();
                    await supabase.auth.signOut();
                    redirect("/login");
                  }}
                >
                  <button
                    type="submit"
                    className="w-full bg-slate-100 text-slate-700 py-3 rounded-lg font-medium hover:bg-slate-200 transition-colors"
                  >
                    Sign Out
                  </button>
                </form>
              </>
            ) : (
              <Link
                href="/login"
                className="block w-full bg-blue-600 text-white text-center py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Return to Login
              </Link>
            )}
          </div>

          {/* Support Link */}
          <p className="text-center text-sm text-slate-500 mt-6">
            If this problem persists, please{" "}
            <a
              href="mailto:support@medicare.com"
              className="text-blue-600 hover:underline"
            >
              contact support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
