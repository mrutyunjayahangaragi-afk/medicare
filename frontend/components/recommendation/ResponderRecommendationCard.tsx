"use client";

import { UserCheck, Clock, MapPin, Phone } from "lucide-react";
import type { ResponderRec } from "@/lib/api/client";

interface ResponderRecommendationCardProps {
  responder: ResponderRec;
}

export default function ResponderRecommendationCard({ responder }: ResponderRecommendationCardProps) {
  return (
    <article
      className="bg-white border border-purple-100 rounded-2xl p-5 space-y-4 shadow-sm"
      aria-label={`Recommended responder: ${responder.name}`}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0"
          aria-hidden="true"
        >
          <UserCheck className="w-5 h-5 text-purple-600" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold text-purple-500 uppercase tracking-wide">
            👨‍⚕️ Best Responder
          </p>
          <h3 className="text-sm font-bold text-slate-900 truncate">{responder.name}</h3>
          {responder.responder_type && (
            <p className="text-xs text-slate-500 mt-0.5 capitalize">{responder.responder_type}</p>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2">
        <div className="flex items-center gap-1.5 bg-slate-50 rounded-lg px-3 py-2">
          <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" aria-hidden="true" />
          <div>
            <p className="text-[10px] text-slate-400">Distance</p>
            <p className="text-xs font-bold text-slate-800">{responder.distance_km} km</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 bg-slate-50 rounded-lg px-3 py-2">
          <Clock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" aria-hidden="true" />
          <div>
            <p className="text-[10px] text-slate-400">ETA</p>
            <p className="text-xs font-bold text-slate-800">~{responder.eta_minutes} min</p>
          </div>
        </div>
      </div>

      {/* Action */}
      {responder.phone ? (
        <a
          href={`tel:${responder.phone}`}
          className="flex items-center justify-center gap-2 w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-600"
          aria-label={`Call responder ${responder.name}`}
        >
          <Phone className="w-3.5 h-3.5" aria-hidden="true" />
          Call Responder
        </a>
      ) : (
        <div className="flex items-center justify-center w-full py-2.5 bg-slate-100 text-slate-500 text-xs font-semibold rounded-xl">
          No contact available
        </div>
      )}
    </article>
  );
}
