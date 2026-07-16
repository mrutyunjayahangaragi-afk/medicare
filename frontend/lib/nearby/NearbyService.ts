/**
 * NearbyService — fetches and normalises nearby medical services.
 * Single responsibility: orchestrate the /api/v1/nearby call and
 * apply client-side search / filter / sort.
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
   * Returns an empty array on failure — callers should show friendly errors.
   */
  static async fetch(
    category: ServiceCategory,
    lat: number,
    lng: number,
    radiusKm = 10
  ): Promise<NearbyServiceType[]> {
    try {
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
    } catch (error) {
      console.error("Failed to fetch nearby services:", error);
      return [];
    }
  }

  /**
   * Fetch all three categories in parallel and merge the results.
   * Uses a single "all" request for efficiency when possible.
   */
  static async fetchAll(
    lat: number,
    lng: number,
    radiusKm = 10
  ): Promise<NearbyServiceType[]> {
    try {
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
    } catch (error) {
      console.error("Failed to fetch all nearby services:", error);
      return [];
    }
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
          const haystack = [s.name, s.address ?? ""]
            .join(" ")
            .toLowerCase();
          if (!haystack.includes(query)) return false;
        }
        return true;
      })
      .sort((a, b) => a.distance - b.distance);
  }
}
