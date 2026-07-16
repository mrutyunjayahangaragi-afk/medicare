"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface LocationUpdaterProps {
  requestId: string;
  isActive: boolean;
  onLocationUpdate?: (location: { lat: number; lng: number; heading?: number; speed?: number }) => void;
}

export default function LocationUpdater({
  requestId,
  isActive,
  onLocationUpdate,
}: LocationUpdaterProps) {
  const watchIdRef = useRef<number | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isActive) {
      stopTracking();
      return;
    }

    startTracking();

    return () => {
      stopTracking();
    };
  }, [isActive, requestId]);

  const startTracking = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }

    setIsTracking(true);
    setError(null);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, heading, speed, accuracy } = position.coords;

        // Update parent component
        if (onLocationUpdate) {
          onLocationUpdate({
            lat: latitude,
            lng: longitude,
            heading: heading || undefined,
            speed: speed || undefined,
          });
        }

        // Update Supabase
        updateLocationInSupabase(latitude, longitude, heading, speed, accuracy);
      },
      (error) => {
        console.error("[LocationUpdater] Geolocation error:", error);
        setError(getErrorMessage(error.code));
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 10000,
      }
    );
  };

  const stopTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTracking(false);
  };

  const updateLocationInSupabase = async (
    latitude: number,
    longitude: number,
    heading: number | null,
    speed: number | null,
    accuracy: number | null
  ) => {
    try {
      const supabase = createClient();
      const { error } = await supabase.rpc("upsert_responder_location", {
        p_request_id: requestId,
        p_latitude: latitude,
        p_longitude: longitude,
        p_heading: heading,
        p_speed: speed,
        p_accuracy: accuracy,
      });

      if (error) {
        console.error("[LocationUpdater] Failed to update location:", error);
      }
    } catch (error) {
      console.error("[LocationUpdater] Error updating location:", error);
    }
  };

  const getErrorMessage = (code: number): string => {
    switch (code) {
      case 1:
        return "Location permission denied. Please enable location access.";
      case 2:
        return "Unable to determine your location. Please try again.";
      case 3:
        return "Location request timed out. Please try again.";
      default:
        return "An unknown error occurred while getting your location.";
    }
  };

  // This component doesn't render anything visible
  return null;
}
