"use client";

import { useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Loader2, CheckCircle2, AlertCircle, WifiOff } from "lucide-react";
import type { LocationState } from "@/types/emergency";
import { reverseGeocode } from "@/lib/emergency";

interface LocationCaptureProps {
  state: LocationState;
  onStateChange: (s: LocationState) => void;
  manualAddress: string;
  onManualAddressChange: (v: string) => void;
  error?: string;
}

export default function LocationCapture({
  state,
  onStateChange,
  manualAddress,
  onManualAddressChange,
  error,
}: LocationCaptureProps) {
  const detect = useCallback(async () => {
    if (!navigator.geolocation) {
      onStateChange({ status: "unsupported" });
      return;
    }
    onStateChange({ status: "requesting" });

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        const address = await reverseGeocode(latitude, longitude);
        onStateChange({ status: "captured", latitude, longitude, accuracy, address });
      },
      (err) => {
        if (err.code === GeolocationPositionError.PERMISSION_DENIED) {
          onStateChange({ status: "denied" });
        } else if (err.code === GeolocationPositionError.TIMEOUT) {
          onStateChange({ status: "timeout" });
        } else {
          onStateChange({ status: "unavailable" });
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [onStateChange]);

  const isBusy = state.status === "requesting";
  const hasCaptured = state.status === "captured";
  const hasError = ["denied", "unavailable", "timeout", "unsupported"].includes(state.status);

  const errorMessages: Record<string, string> = {
    denied:      "Location permission denied. Please allow access in your browser and retry.",
    unavailable: "Location is currently unavailable. Use the manual address below.",
    timeout:     "Location request timed out. Use the manual address below.",
    unsupported: "Your browser does not support geolocation. Use the manual address below.",
  };

  return (
    <div className="space-y-3">
      <p className="text-sm font-bold text-slate-700">
        Location <span className="text-[#E53935]" aria-hidden="true">*</span>
      </p>

      {/* Detect button */}
      <motion.button
        type="button"
        onClick={detect}
        disabled={isBusy || hasCaptured}
        whileHover={isBusy || hasCaptured ? {} : { scale: 1.01 }}
        whileTap={isBusy || hasCaptured ? {} : { scale: 0.99 }}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-semibold transition-all duration-150 cursor-pointer disabled:cursor-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E53935]/40 border-slate-200 bg-white text-slate-700 hover:border-[#E53935] hover:bg-red-50 hover:text-[#E53935] disabled:hover:border-slate-200 disabled:hover:bg-white disabled:hover:text-slate-700"
      >
        {isBusy
          ? <><Loader2 className="w-4 h-4 animate-spin" /> Detecting location…</>
          : <><MapPin className="w-4 h-4" /> Detect My Location</>
        }
      </motion.button>

      {/* Captured state */}
      <AnimatePresence>
        {hasCaptured && state.status === "captured" && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-1.5"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
              <span className="text-xs font-bold text-green-700 uppercase tracking-wide">Location Captured</span>
            </div>
            <p className="text-xs text-slate-600 pl-6 leading-snug">{state.address}</p>
            <p className="text-xs text-slate-400 pl-6 font-mono">
              {state.latitude.toFixed(6)}, {state.longitude.toFixed(6)}
              {state.accuracy != null && ` ± ${Math.round(state.accuracy)}m`}
            </p>
            <button
              type="button"
              onClick={() => onStateChange({ status: "idle" })}
              className="pl-6 text-xs text-[#E53935] font-semibold hover:underline cursor-pointer"
            >
              Clear and re-detect
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Geolocation error */}
      <AnimatePresence>
        {hasError && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            role="alert"
            className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3"
          >
            {state.status === "unsupported"
              ? <WifiOff className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              : <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            }
            <p className="text-xs text-amber-700 font-medium">
              {errorMessages[state.status]}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Manual address fallback — always shown when not captured */}
      {!hasCaptured && (
        <div>
          <label htmlFor="manual-address" className="block text-xs font-semibold text-slate-500 mb-1">
            {hasError ? "Enter your address manually" : "Or enter address manually"}
          </label>
          <textarea
            id="manual-address"
            rows={2}
            value={manualAddress}
            onChange={(e) => onManualAddressChange(e.target.value)}
            placeholder="e.g. Near City Hospital, MG Road, Bengaluru"
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white text-slate-900 text-sm placeholder:text-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-[#E53935]/30 focus:border-[#E53935] transition-all duration-150"
          />
        </div>
      )}

      {error && <p className="text-xs font-medium text-[#E53935]" role="alert">{error}</p>}
    </div>
  );
}
