/**
 * lib/nearby/NearbyService.ts
 * Orchestrates calls to /api/v1/nearby/services and applies client-side
 * search / filter / sort on the returned results.
 *
 * All network errors are re-thrown so the page can set a proper error state
 * instead of silently showing "Nothing found nearby".
 */

import { getNearbyServices, type NearbyServiceItem, NearbyApiError } from "@/lib/api/nearby";
import type { NearbyService as NearbyServiceType, ServiceCategory, NearbyFilters } from "@/types/nearby";

// Distance filter → max km (null = no cap)
const DISTANCE_KM: Record<string, number | null> = {
  all:  null,
  "2km": 2,
  "5km": 5,
  "10km": 10,
};

function toInternal(item: NearbyServiceItem): NearbyServiceType {
  return {
    id: item.id,
    name: item.name,
    category: item.category as ServiceCategory,
    latitude: item.latitude,
    longitude: item.longitude,
    distance: item.distance_km,
    address: item.address,
    city: item.city,
    state: item.state,
    postcode: item.postcode,
    phone: item.phone,
    website: item.website,
    opening_hours: item.opening_hours,
    is_open: item.is_open ?? null,
    google_maps_uri: item.google_maps_uri ?? null,
    source: item.source as NearbyServiceType["source"],
    is_demo: item.is_demo,
  };
}

export class NearbyService {
  /**
   * Fetch all services (or a specific category) from the backend.
   * Throws NearbyApiError or generic Error on failure.
   *
   * @param lat        User latitude
   * @param lng        User longitude
   * @param radiusKm   Search radius (default 10 km, max 25)
   * @param category   "all" | "hospital" | "pharmacy" | "ambulance"
   * @param signal     AbortSignal to cancel an in-flight request
   */
  static async fetchAll(
    lat: number,
    lng: number,
    radiusKm = 10,
    category: ServiceCategory | "all" = "all",
    signal?: AbortSignal
  ): Promise<NearbyServiceType[]> {
    const data = await getNearbyServices({
      latitude: lat,
      longitude: lng,
      category,
      radiusKm,
      limit: 100,
      signal,
    });

    return data.services.map(toInternal);
  }

  /**
   * Apply search, category and distance filters in-memory, then sort nearest-first.
   */
  static filter(services: NearbyServiceType[], filters: NearbyFilters): NearbyServiceType[] {
    const query = filters.search.trim().toLowerCase();
    const maxKm = DISTANCE_KM[filters.distance] ?? null;

    return services
      .filter((s) => {
        if (filters.category !== "all" && s.category !== filters.category) return false;
        if (maxKm !== null && s.distance > maxKm) return false;
        if (query) {
          const haystack = [s.name, s.address, s.city ?? ""].join(" ").toLowerCase();
          if (!haystack.includes(query)) return false;
        }
        return true;
      })
      .sort((a, b) => a.distance - b.distance);
  }
}

// Re-export so callers can catch typed errors
export { NearbyApiError };
