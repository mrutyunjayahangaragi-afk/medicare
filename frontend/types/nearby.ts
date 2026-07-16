/**
 * types/nearby.ts
 * TypeScript types for the Nearby Medical Services module.
 */

export type ServiceCategory = "hospital" | "pharmacy" | "ambulance";

export interface NearbyService {
  id: string;
  name: string;
  category: ServiceCategory;
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
  phone?: string;
  website?: string;
  /** Distance in kilometres from the user's current location */
  distance: number;
  /** Source of the data: 'geoapify' or 'medicare' */
  source?: string;
}

export type LocationStatus =
  | "idle"
  | "requesting"
  | "success"
  | "denied"
  | "unavailable"
  | "timeout"
  | "unsupported";

export interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export type DistanceFilter = "all" | "2km" | "5km" | "10km";

export interface NearbyFilters {
  category: ServiceCategory | "all";
  distance: DistanceFilter;
  search: string;
}

/** Raw Overpass API element */
export interface OverpassElement {
  id: number;
  type: "node" | "way" | "relation";
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

export interface OverpassResponse {
  elements: OverpassElement[];
}

/** API route response shape */
export interface NearbyApiResponse {
  services: NearbyService[];
  error?: string;
}
