import type { Metadata } from "next";
import Link from "next/link";
import { ShieldAlert, ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Access Denied — Medicare",
};

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
        <div className="w-16 h-16 bg-red-50 border border-red-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <ShieldAlert className="w-8 h-8 text-red-500" />
        </div>
        <h1 className="text-2xl font-black text-slate-900 mb-2">Access Denied</h1>
        <p className="text-slate-500 text-sm leading-relaxed mb-8">
          You don&apos;t have permission to view this page. If you believe this is a mistake,
          please contact support or sign in with the correct account.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#E53935] hover:bg-[#C62828] text-white text-sm font-bold rounded-xl shadow-sm shadow-red-200 transition-colors"
          >
            Go to Dashboard
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-xl transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
