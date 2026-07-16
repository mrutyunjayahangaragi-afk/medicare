"use client";

import { ShieldAlert } from "lucide-react";

interface SafetyOverrideAlertProps {
  reason: string;
}

export default function SafetyOverrideAlert({ reason }: SafetyOverrideAlertProps) {
  return (
    <div
      role="alert"
      className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-xl"
    >
      <ShieldAlert
        className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5"
        aria-hidden="true"
      />
      <div>
        <p className="text-xs font-bold text-red-800">Safety rule applied</p>
        <p className="text-xs text-red-700 mt-0.5 leading-snug">{reason}</p>
      </div>
    </div>
  );
}
