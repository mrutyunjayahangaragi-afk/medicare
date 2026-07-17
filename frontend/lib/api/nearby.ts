/**
 * lib/api/nearby.ts
 * Typed client for GET /api/v1/nearby/services
 *
 * Security: The Geoapify key lives only on the backend.
 * This module never reads NEXT_PUBLIC_GEOAPIFY_API_KEY.
 */

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"
).replace(/\/$/, "");

// ── Types ─────────────────────────────────────────────────────────────────

export type NearbyCategory = "all" | "hospital" | "pharmacy" | "ambulance";

export interface NearbyServiceItem {
  id: string;
  name: string;
  /** hospital | pharmacy | ambulance */
  category: string;
  address: string;
  city: string;
  state: string;
  postcode: string;
  latitude: number;
  longitude: number;
  distance_km: number;
  phone: string | null;
  website: string | null;
  opening_hours: string | null;
  /** Whether the place is currently open (Google Places only) */
  is_open?: boolean | null;
  /** Google Maps URI for directions (Google Places only) */
  google_maps_uri?: string | null;
  /** Data source: geoapify | google | medicare */
  source?: string;
  /** True only for dev-mode demo records */
  is_demo: boolean;
}

export interface NearbyServicesResponse {
  services: NearbyServiceItem[];
  count: number;
  latitude: number;
  longitude: number;
  radius_km: number;
  /** Which data sources contributed results */
  sources?: string[];
}

export interface GetNearbyServicesParams {
  latitude: number;
  longitude: number;
  category?: NearbyCategory;
  radiusKm?: number;
  limit?: number;
  /** Pass an AbortController signal to cancel the request */
  signal?: AbortSignal;
}

// ── API call ──────────────────────────────────────────────────────────────

/**
 * Fetch nearby medical services from the FastAPI backend.
 * Throws on HTTP errors — callers should catch and show an error state.
 */
export async function getNearbyServices(
  params: GetNearbyServicesParams
): Promise<NearbyServicesResponse> {
  const qs = new URLSearchParams();
  qs.set("latitude", String(params.latitude));
  qs.set("longitude", String(params.longitude));
  if (params.category && params.category !== "all") {
    qs.set("category", params.category);
  } else {
    qs.set("category", "all");
  }
  if (params.radiusKm != null) qs.set("radius_km", String(params.radiusKm));
  if (params.limit != null) qs.set("limit", String(params.limit));

  const url = `${API_URL}/api/v1/nearby/services?${qs.toString()}`;

  const response = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal: params.signal,
    cache: "no-store",
  });

  if (!response.ok) {
    let detail = `HTTP ${response.status}`;
    try {
      const body = await response.json();
      if (body?.detail) detail = body.detail;
    } catch {
      /* ignore JSON parse errors */
    }
    throw new NearbyApiError(response.status, detail);
  }

  return response.json() as Promise<NearbyServicesResponse>;
}

// ── Error class ───────────────────────────────────────────────────────────

export class NearbyApiError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "NearbyApiError";
  }

  /** True when the server is healthy but has no key configured. */
  get isNotConfigured() {
    return this.status === 503;
  }

  /** True when upstream Geoapify was rate-limited. */
  get isRateLimited() {
    return this.status === 429;
  }

  /** True when the upstream timed out. */
  get isTimeout() {
    return this.status === 504;
  }
}
