/**
 * types/nearby.ts
 * TypeScript types for the Nearby Medical Services module.
 */

export type ServiceCategory = "hospital" | "pharmacy" | "ambulance";

/** Data source that provided this service record. */
export type ServiceSource = "geoapify" | "google" | "medicare" | "demo";

export interface NearbyService {
  id: string;
  name: string;
  category: ServiceCategory;
  latitude: number;
  longitude: number;
  address: string;
  city: string;
  state?: string;
  postcode?: string;
  /** Distance in kilometres from the user's current location */
  distance: number;
  phone?: string | null;
  website?: string | null;
  opening_hours?: string | null;
  /** Whether the place is currently open (Google Places only) */
  is_open?: boolean | null;
  /** Google Maps URI for directions (Google Places only) */
  google_maps_uri?: string | null;
  /** Data source that produced this record */
  source?: ServiceSource;
  /** True for development demo records — never set in production */
  is_demo?: boolean;
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
