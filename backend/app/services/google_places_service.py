"""
app/services/google_places_service.py
Google Places API (New) service for nearby medical services.

Handles:
  - Pharmacy Nearby Search  → POST /v1/places:searchNearby
  - Ambulance Text Search   → POST /v1/places:searchText  (multiple queries)
  - Supabase ambulance fallback (verified ambulance_service orgs)

Security: GOOGLE_PLACES_API_KEY is used only server-side, never logged or
forwarded to the browser.

Reference:
  https://developers.google.com/maps/documentation/places/web-service/nearby-search
  https://developers.google.com/maps/documentation/places/web-service/text-search
"""

from __future__ import annotations

import asyncio
import logging
from math import asin, cos, radians, sin, sqrt
from typing import Any

import httpx

from app.core.config import get_settings

logger = logging.getLogger("medicare.services.google_places")

# ── Google Places API endpoints ───────────────────────────────────────────
_PLACES_BASE = "https://places.googleapis.com/v1/places"
_SEARCH_NEARBY = f"{_PLACES_BASE}:searchNearby"
_SEARCH_TEXT = f"{_PLACES_BASE}:searchText"

# Only request fields we actually use — minimises billing.
_NEARBY_FIELD_MASK = (
    "places.id,"
    "places.displayName,"
    "places.formattedAddress,"
    "places.location,"
    "places.primaryType,"
    "places.types,"
    "places.nationalPhoneNumber,"
    "places.internationalPhoneNumber,"
    "places.regularOpeningHours,"
    "places.googleMapsUri,"
    "places.businessStatus"
)

# ── Ambulance text-search queries ─────────────────────────────────────────
# Google Places has no "ambulance" place type, so we use focused text queries.
_AMBULANCE_QUERIES: list[str] = [
    "ambulance service",
    "emergency ambulance service",
    "24 hour ambulance service",
]

# Name / type tokens that indicate a valid ambulance / EMS result.
_AMBULANCE_ACCEPT_TOKENS: list[str] = [
    "ambulance",
    "ems",
    "emergency medical",
    "emergency transport",
    "medical transport",
    "paramedic",
    "rescue",
    "108",            # common Indian emergency number
    "emergency service",
]

# Tokens that disqualify a result — keeps noise low without over-filtering.
_AMBULANCE_REJECT_TOKENS: list[str] = [
    "car rental",
    "taxi",
    "cab service",
    "tour",
    "hotel",
    "lodge",
    "restaurant",
    "pharmacy",
    "jewellery",
    "jeweler",
]


# ── Haversine ────────────────────────────────────────────────────────────

def _haversine_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Great-circle distance in metres."""
    R = 6_371_000.0
    phi1, phi2 = radians(lat1), radians(lat2)
    dphi = radians(lat2 - lat1)
    dlam = radians(lon2 - lon1)
    a = sin(dphi / 2) ** 2 + cos(phi1) * cos(phi2) * sin(dlam / 2) ** 2
    return 2 * R * asin(sqrt(a))


# ── Normalisation helpers ─────────────────────────────────────────────────

def _opening_hours_text(place: dict[str, Any]) -> str | None:
    """Extract opening hours as a short human-readable string."""
    roh = place.get("regularOpeningHours", {})
    if not roh:
        return None
    if roh.get("openNow") is True:
        return "Open now"
    if roh.get("openNow") is False:
        return "Closed now"
    periods = roh.get("weekdayDescriptions")
    if periods and isinstance(periods, list) and len(periods) > 0:
        return periods[0]  # e.g. "Monday: 9:00 AM – 9:00 PM"
    return None


def _phone(place: dict[str, Any]) -> str | None:
    """Return international phone when present, fall back to national."""
    return (
        place.get("internationalPhoneNumber")
        or place.get("nationalPhoneNumber")
        or None
    )


def _normalize_place(
    place: dict[str, Any],
    user_lat: float,
    user_lon: float,
    category: str,
) -> dict[str, Any]:
    """Convert one Google Places place dict to our standard service dict."""
    loc = place.get("location", {})
    place_lat = float(loc.get("latitude", 0))
    place_lon = float(loc.get("longitude", 0))

    dist_m = _haversine_m(user_lat, user_lon, place_lat, place_lon)

    display_name = place.get("displayName", {})
    name = (
        display_name.get("text") if isinstance(display_name, dict) else str(display_name or "")
    ).strip()
    if not name:
        name = "Unknown" if category != "ambulance" else "Ambulance Service"

    address = (place.get("formattedAddress") or "").strip()

    # Derive city from address (last meaningful comma-separated chunk before
    # the country / postal code if we have a formatted address).
    city = ""
    if address:
        parts = [p.strip() for p in address.split(",") if p.strip()]
        # Heuristic: second-to-last part is often city; last is country
        if len(parts) >= 2:
            city = parts[-2]

    return {
        "id": f"google_{place.get('id', '')}",
        "name": name,
        "category": category,
        "address": address,
        "city": city,
        "state": "",
        "postcode": "",
        "latitude": place_lat,
        "longitude": place_lon,
        "distance_km": round(dist_m / 1000, 2),
        "phone": _phone(place),
        "website": None,
        "opening_hours": _opening_hours_text(place),
        "is_open": place.get("regularOpeningHours", {}).get("openNow"),
        "google_maps_uri": place.get("googleMapsUri") or None,
        "is_demo": False,
        "source": "google",
    }


# ── Ambulance relevance filter ─────────────────────────────────────────────

def _is_ambulance_relevant(place: dict[str, Any]) -> bool:
    """
    Return True when the place looks like an ambulance / EMS provider.

    Accepts when name or types contain an accept token.
    Rejects when name contains a reject token (prevents noise from
    unrelated businesses returned by broad text queries).
    """
    display_name = place.get("displayName", {})
    name_text = (
        display_name.get("text") if isinstance(display_name, dict) else str(display_name or "")
    ).lower()

    types: list[str] = [t.lower() for t in (place.get("types") or [])]
    primary_type = (place.get("primaryType") or "").lower()
    combined = name_text + " " + primary_type + " " + " ".join(types)

    # Hard reject first
    for token in _AMBULANCE_REJECT_TOKENS:
        if token in name_text:
            return False

    # Then check for positive signals
    for token in _AMBULANCE_ACCEPT_TOKENS:
        if token in combined:
            return True

    # Also accept "emergency" place types (fire_station, etc. excluded below)
    emergency_types = {"ambulance_station", "emergency_service"}
    if emergency_types.intersection(set(types)):
        return True

    return False


# ── Async HTTP helpers ────────────────────────────────────────────────────

def _auth_headers(api_key: str) -> dict[str, str]:
    return {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": api_key,          # server-side only, never logged
        "X-Goog-FieldMask": _NEARBY_FIELD_MASK,
    }


async def _post_places(
    client: httpx.AsyncClient,
    url: str,
    body: dict[str, Any],
    api_key: str,
) -> list[dict[str, Any]]:
    """
    POST to a Google Places endpoint and return the raw places list.

    Raises:
        RuntimeError for 400 / 403 / 429 / 5xx responses (not empty list).
    Returns:
        List of raw place dicts (may be empty if Google found nothing).
    """
    resp = await client.post(url, json=body, headers=_auth_headers(api_key))

    if resp.status_code == 400:
        data = {}
        try:
            data = resp.json()
        except Exception:
            pass
        msg = data.get("error", {}).get("message", "Bad request")
        raise RuntimeError(f"Google Places 400: {msg}")

    if resp.status_code == 403:
        data = {}
        try:
            data = resp.json()
        except Exception:
            pass
        msg = data.get("error", {}).get("message", "Permission denied — check API key, billing, and API enablement")
        raise RuntimeError(f"Google Places 403: {msg}")

    if resp.status_code == 429:
        raise RuntimeError("Google Places quota exceeded (429).")

    if resp.status_code >= 500:
        raise RuntimeError(f"Google Places provider error HTTP {resp.status_code}.")

    if resp.status_code != 200:
        raise RuntimeError(f"Google Places unexpected HTTP {resp.status_code}.")

    data = resp.json()
    return data.get("places", [])


# ── Public API functions ──────────────────────────────────────────────────

async def search_nearby_pharmacies(
    latitude: float,
    longitude: float,
    radius_meters: int,
    max_results: int = 20,
) -> list[dict[str, Any]]:
    """
    Search for pharmacies near a coordinate using Google Places Nearby Search.

    Args:
        latitude:      User latitude (-90 … 90)
        longitude:     User longitude (-180 … 180)
        radius_meters: Search radius in metres (max 50 000)
        max_results:   Maximum results to return (1 … 20 for Nearby Search)

    Returns:
        Normalised pharmacy service dicts sorted by distance.

    Raises:
        RuntimeError: When Google Places is not configured or the call fails.
    """
    settings = get_settings()
    if not settings.google_places_enabled or not settings.google_places_api_key:
        raise RuntimeError("Google Places is not configured on this server.")

    # Google Nearby Search caps maxResultCount at 20.
    count = max(1, min(max_results, 20))
    # Google caps the circle radius at 50 000 m for Nearby Search.
    radius = max(1, min(radius_meters, 50_000))

    body: dict[str, Any] = {
        "includedTypes": ["pharmacy"],
        "maxResultCount": count,
        "locationRestriction": {
            "circle": {
                "center": {"latitude": latitude, "longitude": longitude},
                "radius": float(radius),
            }
        },
        "rankPreference": "DISTANCE",
    }

    timeout = float(settings.google_places_timeout_seconds)
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            places = await _post_places(client, _SEARCH_NEARBY, body, settings.google_places_api_key)
    except httpx.TimeoutException:
        raise RuntimeError("Google Places request timed out.")
    except httpx.HTTPError as exc:
        raise RuntimeError(f"Google Places HTTP error: {exc}") from exc

    logger.info(
        "Google Places pharmacy search lat=%.4f lon=%.4f radius=%dm -> %d results",
        latitude, longitude, radius, len(places),
    )

    results = [_normalize_place(p, latitude, longitude, "pharmacy") for p in places]
    results.sort(key=lambda s: s["distance_km"])
    return results


async def search_nearby_ambulances(
    latitude: float,
    longitude: float,
    radius_meters: int,
    max_results: int = 20,
) -> list[dict[str, Any]]:
    """
    Search for ambulance / emergency-medical services near a coordinate using
    Google Places Text Search with multiple focused queries.

    All three queries run in parallel.  Results are deduplicated by Google
    place ID, then filtered for relevance, then sorted by distance.

    Args:
        latitude:      User latitude
        longitude:     User longitude
        radius_meters: Search bias radius in metres
        max_results:   Maximum results per query (1 … 20)

    Returns:
        Normalised ambulance service dicts sorted by distance.

    Raises:
        RuntimeError: When Google Places is not configured or the call fails.
    """
    settings = get_settings()
    if not settings.google_places_enabled or not settings.google_places_api_key:
        raise RuntimeError("Google Places is not configured on this server.")

    count = max(1, min(max_results, 20))
    radius = max(1, min(radius_meters, 50_000))
    timeout = float(settings.google_places_timeout_seconds)

    async def _query(client: httpx.AsyncClient, text_query: str) -> list[dict[str, Any]]:
        body: dict[str, Any] = {
            "textQuery": text_query,
            "locationBias": {
                "circle": {
                    "center": {"latitude": latitude, "longitude": longitude},
                    "radius": float(radius),
                }
            },
            "maxResultCount": count,
        }
        try:
            return await _post_places(client, _SEARCH_TEXT, body, settings.google_places_api_key)  # type: ignore[arg-type]
        except RuntimeError as exc:
            # Log but don't kill the whole request — other queries may succeed.
            logger.warning("Ambulance query %r failed: %s", text_query, exc)
            return []

    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            task_results = await asyncio.gather(
                *[_query(client, q) for q in _AMBULANCE_QUERIES],
                return_exceptions=True,
            )
    except httpx.TimeoutException:
        raise RuntimeError("Google Places request timed out.")
    except httpx.HTTPError as exc:
        raise RuntimeError(f"Google Places HTTP error: {exc}") from exc

    # Flatten and deduplicate by Google place ID
    seen_ids: set[str] = set()
    raw_places: list[dict[str, Any]] = []
    for res in task_results:
        if isinstance(res, Exception):
            logger.warning("Ambulance gather error: %s", res)
            continue
        for place in res:
            pid = place.get("id", "")
            if pid and pid in seen_ids:
                continue
            if pid:
                seen_ids.add(pid)
            raw_places.append(place)

    # Relevance filter — reject unrelated businesses
    filtered = [p for p in raw_places if _is_ambulance_relevant(p)]

    total_raw = len(raw_places)
    total_filtered = len(filtered)
    logger.info(
        "Google Places ambulance search lat=%.4f lon=%.4f radius=%dm -> "
        "%d raw / %d after filter",
        latitude, longitude, radius, total_raw, total_filtered,
    )

    results = [_normalize_place(p, latitude, longitude, "ambulance") for p in filtered]
    results.sort(key=lambda s: s["distance_km"])
    return results


# ── Supabase ambulance fallback ───────────────────────────────────────────

def get_ambulance_orgs_from_supabase(
    user_lat: float,
    user_lon: float,
    radius_km: float = 25.0,
) -> list[dict[str, Any]]:
    """
    Fetch approved ambulance_service organisations from Supabase.

    Queries public.organizations where:
      - organization_type = 'ambulance_service'  (the actual DB enum value)
      - is_verified = True
      - latitude IS NOT NULL
      - longitude IS NOT NULL

    Returns normalised dicts in the same shape as _normalize_place output.
    Never exposes personal details — only public org name, phone, address,
    and coordinates.
    """
    try:
        from app.db.supabase import get_supabase_admin_client

        client = get_supabase_admin_client()
        resp = (
            client.table("organizations")
            .select("id, name, organization_type, phone, address, latitude, longitude")
            .eq("is_verified", True)
            .eq("organization_type", "ambulance_service")
            .not_.is_("latitude", "null")
            .not_.is_("longitude", "null")
            .limit(100)
            .execute()
        )
        rows = resp.data or []
    except Exception as exc:  # noqa: BLE001
        logger.warning("Supabase ambulance fallback unavailable: %s", exc)
        return []

    results: list[dict[str, Any]] = []
    for row in rows:
        try:
            place_lat = float(row["latitude"])
            place_lon = float(row["longitude"])
        except (TypeError, ValueError):
            continue

        dist_m = _haversine_m(user_lat, user_lon, place_lat, place_lon)
        if dist_m / 1000 > radius_km:
            continue

        name = (row.get("name") or "").strip() or "Ambulance Service"
        results.append(
            {
                "id": f"supabase_org_{row['id']}",
                "name": name,
                "category": "ambulance",
                "address": row.get("address") or "",
                "city": "",
                "state": "",
                "postcode": "",
                "latitude": place_lat,
                "longitude": place_lon,
                "distance_km": round(dist_m / 1000, 2),
                "phone": row.get("phone") or None,
                "website": None,
                "opening_hours": None,
                "is_open": None,
                "google_maps_uri": None,
                "is_demo": False,
                "source": "medicare",
            }
        )

    results.sort(key=lambda s: s["distance_km"])
    logger.info(
        "Supabase ambulance fallback lat=%.4f lon=%.4f radius=%.1fkm -> %d orgs",
        user_lat, user_lon, radius_km, len(results),
    )
    return results


# ── Deduplication (shared with route layer) ───────────────────────────────

def deduplicate_ambulance_results(services: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """
    Deduplicate merged ambulance results.

    Priority:
      1. Exact Google place ID match (google_ prefix) — keep first.
      2. Normalised name + rounded coordinates (3 dp ≈ 111 m).

    Google results appear first (callers should pass google + supabase).
    """
    seen_ids: set[str] = set()
    seen_name_coords: set[tuple[str, float, float]] = set()
    out: list[dict[str, Any]] = []

    for s in services:
        sid = s.get("id", "")
        if sid.startswith("google_") and sid in seen_ids:
            continue
        if sid.startswith("google_"):
            seen_ids.add(sid)

        key = (
            s["name"].lower().strip(),
            round(s["latitude"], 3),
            round(s["longitude"], 3),
        )
        if key in seen_name_coords:
            continue
        seen_name_coords.add(key)
        out.append(s)

    return out
