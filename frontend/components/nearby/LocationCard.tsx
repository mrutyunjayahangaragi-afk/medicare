"use client";

/**
 * LocationCard — shows current location status and allows
 * manual lat/lng entry when geolocation is denied.
 */
import { useState } from "react";
import { MapPin, AlertTriangle, WifiOff, Clock, MonitorSmartphone, CheckCircle2, Loader2 } from "lucide-react";
import type { LocationStatus, UserLocation } from "@/types/nearby";

interface LocationCardProps {
  status: LocationStatus;
  location: UserLocation | null;
  onRetry: () => void;
  onManualSubmit: (lat: number, lng: number) => void;
}

const STATUS_CONFIG: Record<
  LocationStatus,
  { icon: React.ReactNode; title: string; description: string; color: string }
> = {
  idle: {
    icon: <MapPin className="w-5 h-5" />,
    title: "Location not set",
    description: "Allow location access to find nearby services.",
    color: "text-slate-500",
  },
  requesting: {
    icon: <Loader2 className="w-5 h-5 animate-spin" />,
    title: "Detecting location…",
    description: "Please allow location access when prompted.",
    color: "text-blue-600",
  },
  success: {
    icon: <CheckCircle2 className="w-5 h-5" />,
    title: "Location detected",
    description: "Showing nearby services for your current location.",
    color: "text-emerald-600",
  },
  denied: {
    icon: <AlertTriangle className="w-5 h-5" />,
    title: "Location access denied",
    description: "Enter your coordinates manually to find nearby services.",
    color: "text-amber-600",
  },
  unavailable: {
    icon: <WifiOff className="w-5 h-5" />,
    title: "Location unavailable",
    description: "Could not determine your location. Enter coordinates manually.",
    color: "text-orange-600",
  },
  timeout: {
    icon: <Clock className="w-5 h-5" />,
    title: "Location timed out",
    description: "The request took too long. Try again or enter manually.",
    color: "text-amber-600",
  },
  unsupported: {
    icon: <MonitorSmartphone className="w-5 h-5" />,
    title: "Geolocation not supported",
    description: "Your browser does not support location. Enter coordinates manually.",
    color: "text-slate-600",
  },
};

export default function LocationCard({
  status,
  location,
  onRetry,
  onManualSubmit,
}: LocationCardProps) {
  const [manualLat, setManualLat] = useState("");
  const [manualLng, setManualLng] = useState("");
  const [manualError, setManualError] = useState("");

  const cfg = STATUS_CONFIG[status];
  const showManual = ["denied", "unavailable", "timeout", "unsupported"].includes(status);
  const showRetry = ["denied", "unavailable", "timeout"].includes(status);

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    setManualError("");

    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);

    if (isNaN(lat) || lat < -90 || lat > 90) {
      setManualError("Latitude must be between −90 and 90.");
      return;
    }
    if (isNaN(lng) || lng < -180 || lng > 180) {
      setManualError("Longitude must be between −180 and 180.");
      return;
    }

    onManualSubmit(lat, lng);
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
      {/* Status row */}
      <div className="flex items-start gap-3">
        <div className={`flex-shrink-0 mt-0.5 ${cfg.color}`} aria-hidden="true">
          {cfg.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-bold ${cfg.color}`}>{cfg.title}</p>
          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{cfg.description}</p>

          {/* Show detected coords */}
          {status === "success" && location && (
            <p className="mt-1.5 text-[10px] font-mono text-slate-400">
              {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
              {location.accuracy != null && (
                <span className="ml-2 text-emerald-500">
                  ±{Math.round(location.accuracy)} m
                </span>
              )}
            </p>
          )}
        </div>

        {/* Retry button */}
        {showRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="flex-shrink-0 text-xs font-semibold text-blue-600 hover:text-blue-700 underline-offset-2 hover:underline transition-colors"
          >
            Retry
          </button>
        )}
      </div>

      {/* Manual entry form */}
      {showManual && (
        <form
          onSubmit={handleManualSubmit}
          className="mt-4 pt-4 border-t border-slate-100"
          noValidate
          aria-label="Enter coordinates manually"
        >
          <p className="text-xs font-semibold text-slate-600 mb-3">
            Enter coordinates manually
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label
                htmlFor="manual-lat"
                className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase tracking-wide"
              >
                Latitude
              </label>
              <input
                id="manual-lat"
                type="number"
                step="any"
                value={manualLat}
                onChange={(e) => setManualLat(e.target.value)}
                placeholder="e.g. 12.9716"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100 transition-all"
                aria-required="true"
              />
            </div>
            <div>
              <label
                htmlFor="manual-lng"
                className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase tracking-wide"
              >
                Longitude
              </label>
              <input
                id="manual-lng"
                type="number"
                step="any"
                value={manualLng}
                onChange={(e) => setManualLng(e.target.value)}
                placeholder="e.g. 77.5946"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100 transition-all"
                aria-required="true"
              />
            </div>
          </div>

          {manualError && (
            <p role="alert" className="mt-1.5 text-xs text-red-600">
              {manualError}
            </p>
          )}

          <button
            type="submit"
            className="mt-3 w-full py-2 px-4 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors focus-visible:outline-2 focus-visible:outline-blue-600"
          >
            Search This Location
          </button>
        </form>
      )}
    </div>
  );
}
