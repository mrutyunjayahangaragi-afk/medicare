/**
 * GET /api/nearby
 *
 * Query params:
 *   type    — "hospital" | "pharmacy" | "ambulance"
 *   lat     — number
 *   lng     — number
 *   radius  — metres (default 10000)
 *
 * Returns: { services: NearbyService[] }
 */
import { NextRequest, NextResponse } from "next/server";
import type {
  NearbyService,
  ServiceCategory,
  OverpassElement,
  OverpassResponse,
} from "@/types/nearby";
import { DistanceCalculator } from "@/lib/nearby/DistanceCalculator";

// ── Overpass query templates ──────────────────────────────────────────────

function buildOverpassQuery(
  type: ServiceCategory,
  lat: number,
  lng: number,
  radius: number
): string {
  const around = `(around:${radius},${lat},${lng})`;

  let nodeFilter: string;
  switch (type) {
    case "hospital":
      nodeFilter = `[amenity=hospital]${around}`;
      break;
    case "pharmacy":
      nodeFilter = `[amenity=pharmacy]${around}`;
      break;
    case "ambulance":
      nodeFilter = `[emergency=ambulance_station]${around}`;
      break;
  }

  return `[out:json][timeout:25];
(
  node${nodeFilter};
  way${nodeFilter};
  relation${nodeFilter};
);
out center tags;`;
}

// ── Normaliser ────────────────────────────────────────────────────────────

function normalise(
  elements: OverpassElement[],
  category: ServiceCategory,
  userLat: number,
  userLng: number
): NearbyService[] {
  const services: NearbyService[] = [];

  for (const el of elements) {
    const lat = el.lat ?? el.center?.lat;
    const lng = el.lon ?? el.center?.lon;

    if (lat === undefined || lng === undefined) continue;

    const tags = el.tags ?? {};
    const rawName = tags.name ?? tags["name:en"] ?? "";
    const name = rawName.trim() || `Unnamed ${category}`;

    // Build a readable address from OSM tags (best-effort)
    const addressParts = [
      tags["addr:housenumber"],
      tags["addr:street"],
      tags["addr:suburb"],
      tags["addr:city"],
      tags["addr:state"],
    ]
      .filter(Boolean)
      .join(", ");
    const address = addressParts || tags["addr:full"] || undefined;

    const phone =
      tags.phone ??
      tags["contact:phone"] ??
      tags["contact:mobile"] ??
      undefined;

    const website =
      tags.website ??
      tags["contact:website"] ??
      tags.url ??
      undefined;

    const distance = DistanceCalculator.compute(userLat, userLng, lat, lng);

    services.push({
      id: `${el.type}-${el.id}`,
      name,
      category,
      latitude: lat,
      longitude: lng,
      address,
      phone,
      website,
      distance,
    });
  }

  return services.sort((a, b) => a.distance - b.distance);
}

// ── Route handler ─────────────────────────────────────────────────────────

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);

  const typeParam = searchParams.get("type");
  const latParam = searchParams.get("lat");
  const lngParam = searchParams.get("lng");
  const radiusParam = searchParams.get("radius");

  // Validate required params
  const VALID_TYPES: ServiceCategory[] = ["hospital", "pharmacy", "ambulance"];
  if (!typeParam || !VALID_TYPES.includes(typeParam as ServiceCategory)) {
    return NextResponse.json(
      { error: "Invalid or missing `type` parameter." },
      { status: 400 }
    );
  }

  const lat = parseFloat(latParam ?? "");
  const lng = parseFloat(lngParam ?? "");
  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json(
      { error: "Invalid or missing `lat`/`lng` parameters." },
      { status: 400 }
    );
  }

  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return NextResponse.json(
      { error: "Coordinates out of valid range." },
      { status: 400 }
    );
  }

  const radius = Math.min(Math.max(parseInt(radiusParam ?? "10000", 10), 500), 50_000);
  const type = typeParam as ServiceCategory;

  // Build Overpass query
  const query = buildOverpassQuery(type, lat, lng, radius);
  const overpassUrl = "https://overpass-api.de/api/interpreter";

  try {
    const res = await fetch(overpassUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `data=${encodeURIComponent(query)}`,
      signal: AbortSignal.timeout(20_000),
    });

    if (!res.ok) {
      console.error("[api/nearby] Overpass non-OK:", res.status);
      return NextResponse.json({ services: [] });
    }

    const json = (await res.json()) as OverpassResponse;
    const services = normalise(json.elements ?? [], type, lat, lng);

    return NextResponse.json({ services });
  } catch (err) {
    // Do not expose internal errors
    console.error("[api/nearby] fetch error:", err instanceof Error ? err.message : "unknown");
    return NextResponse.json(
      { services: [], error: "Unable to fetch nearby services. Please try again." },
      { status: 502 }
    );
  }
}
