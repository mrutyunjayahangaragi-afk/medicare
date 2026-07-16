import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database";

/**
 * Calculate distance between two coordinates in kilometers using Haversine formula
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Calculate ETA based on distance and average speed
 * Returns formatted string like "6 mins"
 */
export function calculateETA(distanceKm: number, speedKmh: number = 40): string {
  if (distanceKm <= 0) return "0 mins";
  if (speedKmh <= 0) return "--";

  const timeHours = distanceKm / speedKmh;
  const timeMinutes = Math.round(timeHours * 60);

  if (timeMinutes < 1) return "< 1 min";
  if (timeMinutes < 60) return `${timeMinutes} min${timeMinutes > 1 ? "s" : ""}`;

  const hours = Math.floor(timeMinutes / 60);
  const remainingMinutes = timeMinutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

/**
 * Format distance for display
 */
export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    const meters = Math.round(distanceKm * 1000);
    return `${meters}m`;
  }
  return `${distanceKm.toFixed(1)}km`;
}

/**
 * Fetch responder location for a specific request
 */
export async function fetchResponderLocation(
  requestId: string
): Promise<Database["public"]["Tables"]["responder_locations"]["Row"] | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("responder_locations")
    .select("*")
    .eq("request_id", requestId)
    .single();

  if (error) {
    console.error("[tracking] fetch responder location:", error.code);
    return null;
  }

  return data;
}

/**
 * Update/persist responder location via the secure FastAPI REST endpoint
 */
export async function updateResponderLocation(
  requestId: string,
  latitude: number,
  longitude: number,
  heading?: number | null,
  speed?: number | null,
  accuracy?: number | null
): Promise<void> {
  const { apiFetch } = await import("@/lib/api/client");
  return apiFetch(`/api/v1/responder/location/${requestId}`, {
    method: "PUT",
    body: JSON.stringify({
      latitude,
      longitude,
      heading: heading ?? null,
      speed: speed ?? null,
      accuracy: accuracy ?? null,
    }),
  });
}

/**
 * Subscribe to responder location updates via Supabase Realtime
 */
export function subscribeToResponderLocation(
  requestId: string,
  onUpdate: (location: Database["public"]["Tables"]["responder_locations"]["Row"]) => void
) {
  const supabase = createClient();

  const channel = supabase
    .channel(`responder_location_${requestId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "responder_locations",
        filter: `request_id=eq.${requestId}`,
      },
      (payload) => {
        if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
          onUpdate(payload.new as Database["public"]["Tables"]["responder_locations"]["Row"]);
        }
      }
    )
    .subscribe((status) => {
      if (status === "SUBSCRIBED") {
        console.log("[tracking] Subscribed to responder location");
      } else if (status === "CHANNEL_ERROR") {
        console.error("[tracking] Channel error");
      }
    });

  return channel;
}

/**
 * Calculate route points between two coordinates
 * This is a simplified version - in production, use a routing API like Mapbox Directions
 */
export function calculateRoute(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number,
  numPoints: number = 10
): { lat: number; lng: number }[] {
  const points: { lat: number; lng: number }[] = [];

  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;
    const lat = startLat + (endLat - startLat) * t;
    const lng = startLng + (endLng - startLng) * t;
    points.push({ lat, lng });
  }

  return points;
}

/**
 * Get bearing between two coordinates (for marker rotation)
 */
export function calculateBearing(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number
): number {
  const startLatRad = toRadians(startLat);
  const startLngRad = toRadians(startLng);
  const endLatRad = toRadians(endLat);
  const endLngRad = toRadians(endLng);

  const y = Math.sin(endLngRad - startLngRad) * Math.cos(endLatRad);
  const x =
    Math.cos(startLatRad) * Math.sin(endLatRad) -
    Math.sin(startLatRad) * Math.cos(endLatRad) * Math.cos(endLngRad - startLngRad);

  const bearing = Math.atan2(y, x);
  const bearingDegrees = (bearing * 180) / Math.PI;
  return (bearingDegrees + 360) % 360;
}
