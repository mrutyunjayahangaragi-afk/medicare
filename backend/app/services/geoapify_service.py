"""
app/services/geoapify_service.py
Geoapify Places API service for nearby medical services.

Security: API key is only used server-side, never logged or forwarded to clients.
"""

from __future__ import annotations

import logging
from math import asin, cos, radians, sin, sqrt
from typing import Any

import httpx

from app.core.config import get_settings

logger = logging.getLogger("medicare.services.geoapify")

# ── Category mapping (valid Geoapify v2 category identifiers) ─────────────
# Reference: https://apidocs.geoapify.com/docs/places/categories/

CATEGORY_MAP: dict[str, list[str]] = {
    "hospital": [
        "healthcare.hospital",
        "healthcare.clinic_or_praxis",
    ],
    "pharmacy": [
        "healthcare.pharmacy",
    ],
    "ambulance": [
        "emergency",
        "emergency.ambulance_station",
        "healthcare.hospital",  # hospitals also provide ambulance service
    ],
    "all": [
        "healthcare.hospital",
        "healthcare.clinic_or_praxis",
        "healthcare.pharmacy",
        "emergency",
        "emergency.ambulance_station",
    ],
}

# How Geoapify category strings map back to our service type
_CATEGORY_TO_TYPE: list[tuple[str, str]] = [
    ("emergency", "ambulance"),
    ("ambulance", "ambulance"),
    ("pharmacy", "pharmacy"),
    ("hospital", "hospital"),
    ("clinic", "hospital"),
]


def _infer_type(categories: list[str], requested: str) -> str:
    """Map Geoapify category strings to hospital | pharmacy | ambulance."""
    joined = " ".join(categories).lower()
    for fragment, stype in _CATEGORY_TO_TYPE:
        if fragment in joined:
            return stype
    # Fall back to requested category when "all" is not ambiguous
    if requested != "all":
        return requested
    return "hospital"


def _haversine_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Great-circle distance in metres."""
    R = 6_371_000.0
    phi1, phi2 = radians(lat1), radians(lat2)
    dphi = radians(lat2 - lat1)
    dlam = radians(lon2 - lon1)
    a = sin(dphi / 2) ** 2 + cos(phi1) * cos(phi2) * sin(dlam / 2) ** 2
    return 2 * R * asin(sqrt(a))


def _format_address(props: dict[str, Any]) -> str:
    """Build a human-readable single-line address from Geoapify properties."""
    parts: list[str] = []
    for key in ("housenumber", "street", "suburb", "city", "postcode", "country"):
        val = props.get(key) or props.get("address_line1") or props.get("address_line2")
        if key == "housenumber":
            val = props.get("housenumber")
        elif key == "street":
            val = props.get("street")
        elif key == "suburb":
            val = props.get("suburb") or props.get("district")
        elif key == "city":
            val = props.get("city") or props.get("municipality") or props.get("town") or props.get("village")
        elif key == "postcode":
            val = props.get("postcode")
        elif key == "country":
            val = props.get("country")
        if val:
            parts.append(str(val))
    if not parts:
        # fallback: formatted address if available
        return props.get("formatted", "") or ""
    return ", ".join(parts)


def _fallback_name(stype: str) -> str:
    return {
        "hospital": "Unnamed Hospital",
        "pharmacy": "Unnamed Pharmacy",
        "ambulance": "Emergency Medical Service",
    }.get(stype, "Medical Service")


def _normalize_feature(
    feature: dict[str, Any],
    user_lat: float,
    user_lon: float,
    requested: str,
) -> dict[str, Any] | None:
    """Convert one Geoapify GeoJSON Feature to our standard service dict."""
    props = feature.get("properties", {})
    geom = feature.get("geometry", {})
    coords = geom.get("coordinates", [])

    # Geoapify returns [longitude, latitude]
    if not coords or len(coords) < 2:
        return None
    place_lon, place_lat = float(coords[0]), float(coords[1])

    categories: list[str] = props.get("categories", [])
    stype = _infer_type(categories, requested)

    # Distance — prefer API-supplied value, fall back to Haversine
    dist_m: float = props.get("distance")  # type: ignore[assignment]
    if dist_m is None:
        dist_m = _haversine_m(user_lat, user_lon, place_lat, place_lon)
    else:
        dist_m = float(dist_m)

    raw_name: str = props.get("name") or ""
    name = raw_name.strip() or _fallback_name(stype)

    address = _format_address(props)
    city = (
        props.get("city")
        or props.get("municipality")
        or props.get("town")
        or props.get("village")
        or ""
    )

    return {
        "id": props.get("place_id") or feature.get("id") or f"geo_{place_lat}_{place_lon}",
        "name": name,
        "category": stype,
        "address": address,
        "city": str(city),
        "state": str(props.get("state") or props.get("county") or ""),
        "postcode": str(props.get("postcode") or ""),
        "latitude": place_lat,
        "longitude": place_lon,
        "distance_km": round(dist_m / 1000, 2),
        "phone": props.get("contact", {}).get("phone") or props.get("phone") or None,
        "website": props.get("contact", {}).get("website") or props.get("website") or None,
        "opening_hours": props.get("opening_hours") or None,
        "is_demo": False,
    }


async def fetch_nearby_services(
    latitude: float,
    longitude: float,
    category: str = "all",
    radius_km: float = 10.0,
    limit: int = 50,
) -> list[dict[str, Any]]:
    """
    Call Geoapify Places API and return normalised service records.

    Args:
        latitude:   User latitude  (-90 … 90)
        longitude:  User longitude (-180 … 180)
        category:   "all" | "hospital" | "pharmacy" | "ambulance"
        radius_km:  Search radius in km (1 … 25)
        limit:      Max results (1 … 100)

    Returns:
        List of normalised service dicts sorted by distance_km.

    Raises:
        RuntimeError: When Geoapify is not configured or the HTTP call fails.
    """
    settings = get_settings()

    if not settings.geoapify_enabled or not settings.geoapify_api_key:
        raise RuntimeError("Geoapify is not configured on this server.")

    cats = CATEGORY_MAP.get(category, CATEGORY_MAP["all"])
    radius_m = int(round(radius_km * 1000))

    params: dict[str, str] = {
        # Correct order: circle:<longitude>,<latitude>,<radius>
        "filter": f"circle:{longitude},{latitude},{radius_m}",
        "bias": f"proximity:{longitude},{latitude}",
        "categories": ",".join(cats),
        "limit": str(min(limit, 100)),
        "apiKey": settings.geoapify_api_key,  # server-side only, never logged
    }

    timeout = float(settings.geoapify_timeout_seconds)

    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            resp = await client.get(
                "https://api.geoapify.com/v2/places",
                params=params,
            )

        if resp.status_code == 401:
            raise RuntimeError("Geoapify API key is invalid (401).")
        if resp.status_code == 429:
            raise RuntimeError("Geoapify rate limit exceeded (429).")
        if resp.status_code != 200:
            raise RuntimeError(f"Geoapify returned HTTP {resp.status_code}.")

        data = resp.json()

    except httpx.TimeoutException:
        raise RuntimeError("Geoapify request timed out.")
    except httpx.HTTPError as exc:
        raise RuntimeError(f"Geoapify HTTP error: {exc}") from exc

    features = data.get("features", [])
    services: list[dict[str, Any]] = []

    for feat in features:
        normalized = _normalize_feature(feat, latitude, longitude, category)
        if normalized is not None:
            services.append(normalized)

    # Sort by distance, nearest first
    services.sort(key=lambda s: s["distance_km"])
    return services


# ── Supabase ambulance fallback ───────────────────────────────────────────

def get_ambulance_orgs_from_supabase(
    user_lat: float,
    user_lon: float,
    radius_km: float = 25.0,
) -> list[dict]:
    """
    Fetch approved ambulance/emergency organisations from Supabase as a
    fallback when live Geoapify data is absent or sparse.

    Only organisations where:
      - organization_type IN ('ambulance', 'emergency', 'emergency_services')
      - is_verified = True
      - latitude AND longitude are non-null
    are returned.  Private details (email, internal IDs beyond place_id) are
    not included — only public contact info.

    Returns a normalised list in the same shape as _normalize_feature output.
    """
    try:
        from app.db.supabase import get_supabase_admin_client

        client = get_supabase_admin_client()
        resp = (
            client.table("organizations")
            .select("id, name, organization_type, phone, address, latitude, longitude")
            .eq("is_verified", True)
            .in_("organization_type", ["ambulance", "emergency", "emergency_services"])
            .not_.is_("latitude", "null")
            .not_.is_("longitude", "null")
            .limit(100)
            .execute()
        )
        rows = resp.data or []
    except Exception as exc:  # noqa: BLE001
        logger.warning("Supabase ambulance fallback unavailable: %s", exc)
        return []

    results: list[dict] = []
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
                "is_demo": False,
                "source": "medicare",
            }
        )

    results.sort(key=lambda s: s["distance_km"])
    return results


def deduplicate_services(services: list[dict]) -> list[dict]:
    """
    Remove duplicate services by (name_lower, rounded lat, rounded lon).
    Keeps the first occurrence (Geoapify results come first when callers
    concatenate live + Supabase lists).
    """
    seen: set[tuple] = set()
    out: list[dict] = []
    for s in services:
        key = (
            s["name"].lower().strip(),
            round(s["latitude"], 3),
            round(s["longitude"], 3),
        )
        if key not in seen:
            seen.add(key)
            out.append(s)
    return out


# ── Development fallback (only when APP_ENV != production) ────────────────

def get_demo_services(
    latitude: float,
    longitude: float,
    category: str = "all",
    radius_km: float = 10.0,
) -> list[dict[str, Any]]:
    """
    Return a small set of synthetic demo services positioned near the user.
    Used ONLY in development mode when Geoapify is unavailable.
    Every record has is_demo=True so the UI can show a "Demo data" badge.
    """
    from math import cos, radians

    # Roughly 1 degree ≈ 111 km. Offset in degrees for ~1-3 km placement.
    d = 0.009  # ~1 km
    lat, lon = latitude, longitude
    base: list[dict[str, Any]] = [
        {
            "id": "demo-hospital-1",
            "name": "Demo General Hospital",
            "category": "hospital",
            "address": "123 Demo Street",
            "city": "Demo City",
            "state": "",
            "postcode": "",
            "latitude": lat + d,
            "longitude": lon + d,
            "distance_km": round(_haversine_m(lat, lon, lat + d, lon + d) / 1000, 2),
            "phone": "+91 98765 43210",
            "website": None,
            "opening_hours": "24/7",
            "is_demo": True,
        },
        {
            "id": "demo-pharmacy-1",
            "name": "Demo Pharmacy",
            "category": "pharmacy",
            "address": "45 Health Avenue",
            "city": "Demo City",
            "state": "",
            "postcode": "",
            "latitude": lat - d * 0.5,
            "longitude": lon + d * 1.2,
            "distance_km": round(_haversine_m(lat, lon, lat - d * 0.5, lon + d * 1.2) / 1000, 2),
            "phone": None,
            "website": None,
            "opening_hours": "08:00–22:00",
            "is_demo": True,
        },
        {
            "id": "demo-ambulance-1",
            "name": "Demo Emergency Services",
            "category": "ambulance",
            "address": "7 Emergency Road",
            "city": "Demo City",
            "state": "",
            "postcode": "",
            "latitude": lat + d * 0.3,
            "longitude": lon - d * 0.8,
            "distance_km": round(_haversine_m(lat, lon, lat + d * 0.3, lon - d * 0.8) / 1000, 2),
            "phone": "112",
            "website": None,
            "opening_hours": "24/7",
            "is_demo": True,
        },
    ]

    if category == "all":
        result = base
    else:
        result = [s for s in base if s["category"] == category]

    # Apply radius filter
    result = [s for s in result if s["distance_km"] <= radius_km]
    result.sort(key=lambda s: s["distance_km"])
    return result
