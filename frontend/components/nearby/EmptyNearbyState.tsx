"use client";

import { MapPin, WifiOff, AlertTriangle, SearchX } from "lucide-react";
import type { ServiceCategory } from "@/types/nearby";

type EmptyReason = "no-results" | "no-internet" | "location-unavailable" | "search-no-match";

interface EmptyNearbyStateProps {
  reason: EmptyReason;
  category?: ServiceCategory | "all";
  onRetry?: () => void;
}

// Category-specific "no results" messages — precise per spec
const NO_RESULTS_DESC: Record<ServiceCategory | "all", string> = {
  hospital:
    "No hospitals were found within the selected distance. Try increasing the search radius.",
  pharmacy:
    "No pharmacies were found within the selected distance. Try increasing the search radius.",
  ambulance:
    "No verified ambulance services were found within the selected distance. Try increasing the search radius.",
  all: "No medical services were found nearby. Try increasing the search radius or switch category.",
};

const CONFIG: Record<
  EmptyReason,
  {
    Icon: React.ComponentType<{ className?: string }>;
    title: string;
    description: (cat: ServiceCategory | "all") => string;
    iconBg: string;
    iconColor: string;
  }
> = {
  "no-results": {
    Icon: MapPin,
    title: "Nothing found nearby",
    description: (cat) => NO_RESULTS_DESC[cat],
    iconBg: "bg-slate-100",
    iconColor: "text-slate-500",
  },
  "no-internet": {
    Icon: WifiOff,
    title: "Service temporarily unavailable",
    description: (cat) => {
      const label =
        cat === "pharmacy"
          ? "Nearby pharmacies"
          : cat === "ambulance"
          ? "Nearby ambulance services"
          : cat === "hospital"
          ? "Nearby hospitals"
          : "Nearby services";
      return `${label} could not be loaded. Please check your connection and try again.`;
    },
    iconBg: "bg-amber-50",
    iconColor: "text-amber-500",
  },
  "location-unavailable": {
    Icon: AlertTriangle,
    title: "Location unavailable",
    description: () =>
      "We couldn't determine your location. Enter coordinates manually or allow location access.",
    iconBg: "bg-orange-50",
    iconColor: "text-orange-500",
  },
  "search-no-match": {
    Icon: SearchX,
    title: "No matches",
    description: () =>
      "No services match your search. Try a different name, address or city.",
    iconBg: "bg-blue-50",
    iconColor: "text-blue-500",
  },
};

export default function EmptyNearbyState({
  reason,
  category = "all",
  onRetry,
}: EmptyNearbyStateProps) {
  const { Icon, title, description, iconBg, iconColor } = CONFIG[reason];

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center justify-center py-12 px-4 text-center"
    >
      <div
        className={`w-16 h-16 rounded-2xl ${iconBg} ${iconColor} flex items-center justify-center mb-4`}
        aria-hidden="true"
      >
        <Icon className="w-8 h-8" />
      </div>
      <h3 className="text-sm font-bold text-slate-800 mb-1">{title}</h3>
      <p className="text-xs text-slate-500 max-w-xs leading-relaxed mb-4">
        {description(category)}
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors focus-visible:outline-2 focus-visible:outline-blue-600"
        >
          Try Again
        </button>
      )}
    </div>
  );
}
