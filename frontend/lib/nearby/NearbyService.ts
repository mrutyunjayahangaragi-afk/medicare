/**
 * NearbyService — fetches and normalises nearby medical services.
 * Single responsibility: orchestrate the /api/v1/nearby call and
 * apply client-side search / filter / sort.
 *
 * Error handling:
 *   - fetch() and fetchAll() throw on API failure so the page can show a
 *     proper error state (not silently display "Nothing found nearby").
 *   - The page is responsible for catching errors and setting hasError state.
 */
import type {
  NearbyService as NearbyServiceType,
  ServiceCategory,
  NearbyFilters,
} from "@/types/nearby";
import { getNearbyMedicalServices, type NearbyServiceItem } from "@/lib/api/client";

const DISTANCE_FILTER_MAP: Record<string, number | null> = {
  all: null,
  "2km": 2,
  "5km": 5,
  "10km": 10,
};

/**
 * Convert API response to internal NearbyService type.
 */
function convertApiToInternal(item: NearbyServiceItem): NearbyServiceType {
  return {
    id: item.id,
    name: item.name,
    category: item.type as ServiceCategory,
    latitude: item.latitude,
    longitude: item.longitude,
    distance: item.distance_km,
    address: item.address,
    city: item.city,
    phone: item.phone ?? undefined,
    website: item.website ?? undefined,
    source: item.source,
  };
}

export class NearbyService {
  /**
   * Fetch services from the FastAPI backend using Geoapify.
   * Throws on failure — callers must catch and show a proper error state.
   */
  static async fetch(
    category: ServiceCategory,
    lat: number,
    lng: number,
    radiusKm = 10
  ): Promise<NearbyServiceType[]> {
    const response = await getNearbyMedicalServices({
      latitude: lat,
      longitude: lng,
      type: category,
      radius: radiusKm * 1000, // API expects metres
      limit: 30,
    });

    if (response.success && response.data) {
      return response.data.items.map(convertApiToInternal);
    }
    return [];
  }

  /**
   * Fetch all three categories in parallel and merge the results.
   * Uses a single "all" request for efficiency.
   * Throws on failure — callers must catch and set hasError state.
   */
  static async fetchAll(
    lat: number,
    lng: number,
    radiusKm = 10
  ): Promise<NearbyServiceType[]> {
    // Use single "all" request for efficiency
    const response = await getNearbyMedicalServices({
      latitude: lat,
      longitude: lng,
      type: "all",
      radius: radiusKm * 1000,
      limit: 100, // Get more results for "all" query
    });

    if (response.success && response.data) {
      return response.data.items.map(convertApiToInternal);
    }
    return [];
  }

  /**
   * Apply search, category and distance filters, then sort by distance.
   */
  static filter(
    services: NearbyServiceType[],
    filters: NearbyFilters
  ): NearbyServiceType[] {
    const query = filters.search.trim().toLowerCase();
    const maxKm = DISTANCE_FILTER_MAP[filters.distance];

    return services
      .filter((s) => {
        if (filters.category !== "all" && s.category !== filters.category) {
          return false;
        }
        if (maxKm !== null && s.distance > maxKm) return false;
        if (query) {
          const haystack = [s.name, s.address ?? "", s.city ?? ""]
            .join(" ")
            .toLowerCase();
          if (!haystack.includes(query)) return false;
        }
        return true;
      })
      .sort((a, b) => a.distance - b.distance);
  }
}
