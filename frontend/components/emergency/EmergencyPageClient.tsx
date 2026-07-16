"use client";

import { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { History } from "lucide-react";
import TopNavbar from "@/components/dashboard/TopNavbar";
import RequestSummary from "./RequestSummary";
import type { EmergencyFormValues, LocationState } from "@/types/emergency";

// Dynamically import heavy form (Leaflet + geolocation)
const EmergencyRequestForm = dynamic(() => import("./EmergencyRequestForm"), {
  ssr: false,
  loading: () => (
    <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6 space-y-4 animate-pulse">
      <div className="h-5 w-48 bg-slate-200 rounded" />
      <div className="grid grid-cols-5 gap-2">
        {[...Array(10)].map((_, i) => (
          <div key={i} className="h-16 bg-slate-100 rounded-xl" />
        ))}
      </div>
      <div className="h-11 bg-slate-100 rounded-xl" />
      <div className="h-32 bg-slate-100 rounded-xl" />
      <div className="h-14 bg-red-100 rounded-xl" />
    </div>
  ),
});

const defaultValues: EmergencyFormValues = {
  emergency_type: null,
  severity: null,
  description: "",
  contact_number: "",
  location: { status: "idle" } as LocationState,
  manual_address: "",
  evidence_path: null,
  confirmed: false,
};

interface Props {
  userId: string;
  profileName: string;
  initialPhone: string;
  avatarUrl?: string | null;
  userEmail?: string;
}

export default function EmergencyPageClient({
  userId,
  profileName,
  initialPhone,
  avatarUrl = null,
  userEmail = "",
}: Props) {
  const [formValues, setFormValues] = useState<EmergencyFormValues>(defaultValues);

  // TopNavbar accepts { user: { fullName, email, avatarUrl } }
  const navUser = {
    fullName: profileName,
    email: userEmail,
    avatarUrl,
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <TopNavbar user={navUser} />

      <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 lg:pb-8">
        {/* Page header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black text-slate-900">Emergency Help</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              We&apos;re here to help you in any emergency situation.
            </p>
          </div>
          <Link
            href="/dashboard/emergency/history"
            className="hidden sm:inline-flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors"
          >
            <History className="w-4 h-4" />
            My History
          </Link>
        </div>

        {/* Two-column on desktop */}
        <div className="grid lg:grid-cols-[1fr_360px] gap-5 items-start">
          <EmergencyRequestForm
            userId={userId}
            initialPhone={initialPhone}
            onValuesChange={setFormValues}
          />
          <div className="hidden lg:block sticky top-4">
            <RequestSummary values={formValues} />
          </div>
        </div>

        {/* Mobile: history link */}
        <div className="mt-4 sm:hidden">
          <Link
            href="/dashboard/emergency/history"
            className="flex items-center justify-center gap-2 w-full py-3 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700"
          >
            <History className="w-4 h-4" />
            View My Emergency History
          </Link>
        </div>
      </main>
    </div>
  );
}
