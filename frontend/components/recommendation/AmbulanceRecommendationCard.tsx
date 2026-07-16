"use client";

import { Ambulance, Clock, MapPin, Phone } from "lucide-react";
import type { AmbulanceRec } from "@/lib/api/client";

interface AmbulanceRecommendationCardProps {
  ambulance: AmbulanceRec;
}

const STATUS_COLOR: Record<string, string> = {
  available: "bg-emerald-100 text-emerald-700",
  busy:      "bg-amber-100 text-amber-700",
  offline:   "bg-slate-100 text-slate-500",
};

export default function AmbulanceRecommendationCard({ ambulance }: AmbulanceRecommendationCardProps) {
  const statusStyle = STATUS_COLOR[ambulance.availability_status ?? "offline"] ?? STATUS_COLOR.offline;

  return (
    <article
      className="bg-white border border-emerald-100 rounded-2xl p-5 space-y-4 shadow-sm"
      aria-label={`Recommended ambulance: ${ambulance.name}`}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0"
          aria-hidden="true"
        >
          <Ambulance className="w-5 h-5 text-emerald-600" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wide">
            🚑 Best Ambulance
          </p>
          <h3 className="text-sm font-bold text-slate-900 truncate">{ambulance.name}</h3>
          {ambulance.availability_status && (
            <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusStyle}`}>
              {ambulance.availability_status}
            </span>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2">
        <div className="flex items-center gap-1.5 bg-slate-50 rounded-lg px-3 py-2">
          <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" aria-hidden="true" />
          <div>
            <p className="text-[10px] text-slate-400">Distance</p>
            <p className="text-xs font-bold text-slate-800">{ambulance.distance_km} km</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 bg-slate-50 rounded-lg px-3 py-2">
          <Clock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" aria-hidden="true" />
          <div>
            <p className="text-[10px] text-slate-400">ETA</p>
            <p className="text-xs font-bold text-slate-800">~{ambulance.eta_minutes} min</p>
          </div>
        </div>
      </div>

      {/* Action */}
      {ambulance.phone ? (
        <a
          href={`tel:${ambulance.phone}`}
          className="flex items-center justify-center gap-2 w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
          aria-label={`Call ambulance ${ambulance.name}`}
        >
          <Phone className="w-3.5 h-3.5" aria-hidden="true" />
          Call Ambulance
        </a>
      ) : (
        <div className="flex items-center justify-center w-full py-2.5 bg-slate-100 text-slate-500 text-xs font-semibold rounded-xl">
          No contact available
        </div>
      )}
    </article>
  );
}
