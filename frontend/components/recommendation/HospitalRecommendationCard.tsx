"use client";

import { Building2, Clock, MapPin, Navigation } from "lucide-react";
import type { HospitalRec } from "@/lib/api/client";

interface HospitalRecommendationCardProps {
  hospital: HospitalRec;
}

export default function HospitalRecommendationCard({ hospital }: HospitalRecommendationCardProps) {
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(hospital.name + (hospital.address ? ` ${hospital.address}` : ""))}`;

  return (
    <article
      className="bg-white border border-blue-100 rounded-2xl p-5 space-y-4 shadow-sm"
      aria-label={`Recommended hospital: ${hospital.name}`}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0"
          aria-hidden="true"
        >
          <Building2 className="w-5 h-5 text-blue-600" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wide">
            🏥 Best Hospital
          </p>
          <h3 className="text-sm font-bold text-slate-900 truncate">{hospital.name}</h3>
          {hospital.address && (
            <p className="text-xs text-slate-500 mt-0.5 truncate">{hospital.address}</p>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2">
        <div className="flex items-center gap-1.5 bg-slate-50 rounded-lg px-3 py-2">
          <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" aria-hidden="true" />
          <div>
            <p className="text-[10px] text-slate-400">Distance</p>
            <p className="text-xs font-bold text-slate-800">{hospital.distance_km} km</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 bg-slate-50 rounded-lg px-3 py-2">
          <Clock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" aria-hidden="true" />
          <div>
            <p className="text-[10px] text-slate-400">ETA</p>
            <p className="text-xs font-bold text-slate-800">~{hospital.eta_minutes} min</p>
          </div>
        </div>
      </div>

      {/* Action */}
      <a
        href={mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        aria-label={`Open navigation to ${hospital.name}`}
      >
        <Navigation className="w-3.5 h-3.5" aria-hidden="true" />
        Open Navigation
      </a>
    </article>
  );
}
