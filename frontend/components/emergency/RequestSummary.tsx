"use client";

import Image from "next/image";
import { MapPin, Clock, Phone, ShieldAlert } from "lucide-react";
import { EMERGENCY_TYPES, SEVERITY_LEVELS, STATUS_CONFIG } from "@/types/emergency";
import type { EmergencyFormValues } from "@/types/emergency";

interface RequestSummaryProps {
  values: EmergencyFormValues;
}

export default function RequestSummary({ values }: RequestSummaryProps) {
  const typeInfo = EMERGENCY_TYPES.find((t) => t.id === values.emergency_type);
  const sevInfo  = SEVERITY_LEVELS.find((s) => s.id === values.severity);
  const status   = STATUS_CONFIG["pending"];
  const now = new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

  const locationText =
    values.location.status === "captured"
      ? values.location.address
      : values.manual_address.trim() || null;

  return (
    <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <h3 className="text-sm font-black text-slate-900">Live Preview</h3>
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${status.bg} ${status.color}`}>
          Draft
        </span>
      </div>

      <div className="p-5 space-y-4 text-sm">
        {/* Type */}
        <div className="flex items-center gap-3">
          <span className="text-2xl" aria-hidden="true">{typeInfo?.emoji ?? "❓"}</span>
          <div>
            <p className="text-xs text-slate-400">Emergency Type</p>
            <p className="font-bold text-slate-900">{typeInfo?.label ?? <span className="text-slate-300 italic text-xs">Not selected</span>}</p>
          </div>
        </div>

        {/* Severity */}
        {sevInfo ? (
          <div className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${sevInfo.dot} flex-shrink-0`} />
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full border-2 ${sevInfo.active}`}>
              {sevInfo.label} Severity
            </span>
          </div>
        ) : (
          <p className="text-xs text-slate-300 italic">Severity not selected</p>
        )}

        {/* Location */}
        {locationText ? (
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-[#E53935] flex-shrink-0 mt-0.5" />
            <p className="text-xs text-slate-600 leading-snug">{locationText}</p>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-slate-300 italic">
            <MapPin className="w-4 h-4" /> Location not captured
          </div>
        )}

        {/* Contact */}
        {values.contact_number.trim() ? (
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <p className="text-xs text-slate-600">{values.contact_number}</p>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-slate-300 italic">
            <Phone className="w-4 h-4" /> No contact number
          </div>
        )}

        {/* Description */}
        <div className="bg-slate-50 rounded-xl p-3">
          {values.description.trim()
            ? <p className="text-xs text-slate-600 leading-relaxed">{values.description}</p>
            : <p className="text-xs text-slate-300 italic">No description yet</p>
          }
        </div>

        {/* Evidence preview */}
        {values.evidence_path && (
          <div className="text-xs text-slate-400 font-mono truncate bg-slate-50 rounded-lg px-3 py-2">
            {values.evidence_path}
          </div>
        )}

        {/* Time */}
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Clock className="w-3.5 h-3.5" />
          <span>{now}</span>
        </div>

        {/* Hint */}
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
          <ShieldAlert className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700 font-medium">
            Complete all required fields, then tap &ldquo;Send SOS&rdquo;.
          </p>
        </div>
      </div>
    </div>
  );
}
