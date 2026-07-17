"use client";

import { Hospital, Pill, Ambulance, MapPin, Phone, Globe, Navigation, ExternalLink, Clock } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import type { NearbyService } from "@/types/nearby";
import { DistanceCalculator } from "@/lib/nearby/DistanceCalculator";

interface ServiceCardProps {
  service: NearbyService;
  isSelected: boolean;
  onSelect: (service: NearbyService) => void;
  onLocate: (service: NearbyService) => void;
  index: number;
}

const CATEGORY_CONFIG = {
  hospital: {
    Icon: Hospital,
    label: "Hospital",
    bg: "bg-blue-50",
    iconColor: "text-blue-600",
    badge: "bg-blue-100 text-blue-700 border-blue-200",
  },
  pharmacy: {
    Icon: Pill,
    label: "Pharmacy",
    bg: "bg-emerald-50",
    iconColor: "text-emerald-600",
    badge: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  ambulance: {
    Icon: Ambulance,
    label: "Ambulance",
    bg: "bg-red-50",
    iconColor: "text-red-600",
    badge: "bg-red-100 text-red-700 border-red-200",
  },
} as const;

export default function ServiceCard({
  service,
  isSelected,
  onSelect,
  onLocate,
  index,
}: ServiceCardProps) {
  const shouldReduceMotion = useReducedMotion();
  const cfg = CATEGORY_CONFIG[service.category];
  const Icon = cfg.Icon;

  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${service.latitude},${service.longitude}`;

  return (
    <motion.article
      initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index * 0.04, 0.4) }}
      onClick={() => onSelect(service)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(service);
        }
      }}
      tabIndex={0}
      role="button"
      className={[
        "bg-white rounded-2xl border p-4 cursor-pointer transition-all duration-150",
        "hover:shadow-md focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none",
        isSelected
          ? "border-blue-500 shadow-md shadow-blue-100 ring-2 ring-blue-200"
          : "border-slate-100 hover:border-slate-200",
      ].join(" ")}
      aria-label={`${service.name}, ${cfg.label}, ${DistanceCalculator.format(service.distance)} away. Press Enter to view details.`}
      aria-pressed={isSelected}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className={`flex-shrink-0 w-10 h-10 rounded-xl ${cfg.bg} ${cfg.iconColor} flex items-center justify-center`}
          aria-hidden="true"
        >
          <Icon className="w-5 h-5" />
        </div>

        {/* Main info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-bold text-slate-900 leading-snug truncate">
              {service.name}
            </h3>
            <span className="text-xs font-bold text-slate-600 whitespace-nowrap flex-shrink-0">
              {DistanceCalculator.format(service.distance)}
            </span>
          </div>

          {/* Category badge */}
          <span
            className={`inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${cfg.badge}`}
          >
            {cfg.label}
          </span>

          {/* Address */}
          {service.address && (
            <p className="mt-2 text-xs text-slate-500 flex items-start gap-1 leading-snug">
              <MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-slate-400" aria-hidden="true" />
              <span className="line-clamp-2">{service.address}</span>
            </p>
          )}

          {/* Phone */}
          {service.phone && (
            <a
              href={`tel:${service.phone}`}
              onClick={(e) => e.stopPropagation()}
              className="mt-1.5 text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
              aria-label={`Call ${service.name}: ${service.phone}`}
            >
              <Phone className="w-3 h-3" aria-hidden="true" />
              {service.phone}
            </a>
          )}

          {/* Website */}
          {service.website && (
            <a
              href={service.website.startsWith("http") ? service.website : `https://${service.website}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="mt-1 text-xs text-slate-500 hover:text-blue-600 flex items-center gap-1 transition-colors truncate"
              aria-label={`Visit website for ${service.name}`}
            >
              <Globe className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
              <span className="truncate">{service.website.replace(/^https?:\/\//, "")}</span>
              <ExternalLink className="w-2.5 h-2.5 flex-shrink-0" aria-hidden="true" />
            </a>
          )}

          {/* Opening hours */}
          {service.opening_hours && (
            <p className="mt-1 text-xs text-slate-500 flex items-center gap-1">
              <Clock className="w-3 h-3 flex-shrink-0 text-slate-400" aria-hidden="true" />
              {service.opening_hours}
            </p>
          )}

          {/* Demo badge */}
          {service.is_demo && (
            <span className="inline-flex items-center mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200">
              Demo data
            </span>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="mt-3 flex gap-2" onClick={(e) => e.stopPropagation()}>
        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-blue-600"
          aria-label={`Get directions to ${service.name}`}
        >
          <Navigation className="w-3.5 h-3.5" aria-hidden="true" />
          Get Directions
        </a>
        <button
          type="button"
          onClick={() => onLocate(service)}
          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-slate-400"
          aria-label={`View ${service.name} on map`}
        >
          <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
          View on Map
        </button>
      </div>
    </motion.article>
  );
}
