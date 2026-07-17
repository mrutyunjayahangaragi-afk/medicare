"""
app/api/v1/routes/nearby.py
Nearby medical services endpoint.

GET /api/v1/nearby/services
  ?latitude=<float>
  &longitude=<float>
  &category=all|hospital|pharmacy|ambulance   (default: all)
  &radius_km=<float>                          (default: 10, max: 25)
  &limit=<int>                                (default: 50, max: 100)

Provider routing
────────────────
hospital  → Geoapify Places API  (existing, working)
pharmacy  → Google Places Nearby Search (includedTypes=["pharmacy"])
ambulance → Google Places Text Search  + Supabase ambulance_service fallback
all       → merge all three categories in parallel

Response (200):
  {
    "services":  [ NearbyServiceItem, … ],
    "count":     <int>,
    "latitude":  <float>,
    "longitude": <float>,
    "radius_km": <float>,
    "sources":   ["geoapify" | "google" | "medicare"]
  }

HTTP errors:
  400 — bad request parameters
  429 — upstream rate limit
  503 — provider not configured / unavailable
  504 — upstream timeout

Security:
  API keys (Geoapify, Google Places) are used only here, never forwarded
  to the browser.

Caching:
  Results are cached for 3 minutes keyed by (lat, lon, category, radius).
  Coordinates are rounded to 3 dp (~111 m) so nearby requests share an entry.
"""

from __future__ import annotations

import asyncio
import hashlib
import logging
import time
from typing import Any

from fastapi import APIRouter, HTTPException, Query, status

from app.core.config import get_settings
from app.services.geoapify_service import (
    fetch_nearby_services as _geoapify_fetch,
    get_demo_services,
    deduplicate_services as _geo_dedup,
)
from app.services.google_places_service import (
    search_nearby_pharmacies,
    search_nearby_ambulances,
    get_ambulance_orgs_from_supabase,
    deduplicate_ambulance_results,
)

logger = logging.getLogger("medicare.routes.nearby")

router = APIRouter()

# ── In-process cache ──────────────────────────────────────────────────────
_CACHE: dict[str, tuple[dict[str, Any], float]] = {}
_CACHE_TTL = 180.0
_CACHE_MAX = 500


def _cache_key(lat: float, lon: float, category: str, radius_km: float) -> str:
    s = f"{round(lat, 3)}:{round(lon, 3)}:{category}:{round(radius_km, 1)}"
    return hashlib.md5(s.encode()).hexdigest()


def _cache_get(key: str) -> dict[str, Any] | None:
    entry = _CACHE.get(key)
    if entry and time.monotonic() < entry[1]:
        return entry[0]
    _CACHE.pop(key, None)
    return None


def _cache_set(key: str, value: dict[str, Any]) -> None:
    if len(_CACHE) >= _CACHE_MAX:
        sorted_keys = sorted(_CACHE, key=lambda k: _CACHE[k][1])
        for k in sorted_keys[: _CACHE_MAX // 5]:
            _CACHE.pop(k, None)
    _CACHE[key] = (value, time.monotonic() + _CACHE_TTL)


# ── Per-category fetch helpers ────────────────────────────────────────────

async def _fetch_hospitals(
    latitude: float,
    longitude: float,
    radius_km: float,
    limit: int,
) -> list[dict[str, Any]]:
    """Fetch hospitals via Geoapify (existing working path — unchanged)."""
    return await _geoapify_fetch(
        latitude=latitude,
        longitude=longitude,
        category="hospital",
        radius_km=radius_km,
        limit=limit,
    )


async def _fetch_pharmacies(
    latitude: float,
    longitude: float,
    radius_km: float,
    limit: int,
) -> list[dict[str, Any]]:
    """Fetch pharmacies via Google Places Nearby Search."""
    radius_m = int(round(radius_km * 1000))
    return await search_nearby_pharmacies(
        latitude=latitude,
        longitude=longitude,
        radius_meters=radius_m,
        max_results=min(limit, 20),
    )


async def _fetch_ambulances(
    latitude: float,
    longitude: float,
    radius_km: float,
    limit: int,
) -> list[dict[str, Any]]:
    """
    Fetch ambulance services via Google Places Text Search, then merge with
    the Supabase ambulance_service organisation fallback.
    """
    radius_m = int(round(radius_km * 1000))

    # Google Text Search (may return 0 in sparse areas — that is not an error)
    try:
        google_results = await search_nearby_ambulances(
            latitude=latitude,
            longitude=longitude,
            radius_meters=radius_m,
            max_results=min(limit, 20),
        )
    except RuntimeError as exc:
        msg = str(exc)
        # Config errors bubble up; transient errors fall through to Supabase only
        if "not configured" in msg:
            raise
        logger.warning("Google ambulance search failed (will use Supabase fallback): %s", msg)
        google_results = []

    # Supabase fallback — always run, then merge
    supabase_results: list[dict[str, Any]] = []
    try:
        supabase_results = get_ambulance_orgs_from_supabase(latitude, longitude, radius_km)
    except Exception as exc:  # noqa: BLE001
        logger.warning("Supabase ambulance fallback failed: %s", exc)

    # Merge: Google first (higher quality), then Supabase; deduplicate
    combined = deduplicate_ambulance_results(google_results + supabase_results)
    combined.sort(key=lambda s: s["distance_km"])
    return combined


# ── Endpoint ──────────────────────────────────────────────────────────────

@router.get(
    "/services",
    summary="Nearby medical services",
    description=(
        "Find hospitals, pharmacies and ambulance services near a coordinate. "
        "Hospitals: Geoapify. Pharmacy: Google Places Nearby Search. "
        "Ambulance: Google Places Text Search + Supabase verified orgs. "
        "API keys are never forwarded to the browser."
    ),
    responses={
        200: {"description": "Services found (may be empty list)"},
        400: {"description": "Invalid parameters"},
        503: {"description": "Provider not configured"},
        429: {"description": "Rate limit exceeded"},
        504: {"description": "Upstream timeout"},
    },
)
async def get_nearby_services(
    latitude: float = Query(..., ge=-90.0, le=90.0),
    longitude: float = Query(..., ge=-180.0, le=180.0),
    category: str = Query(
        default="all",
        description="all | hospital | pharmacy | ambulance",
    ),
    radius_km: float = Query(default=10.0, ge=1.0, le=25.0),
    limit: int = Query(default=50, ge=1, le=100),
) -> dict[str, Any]:
    settings = get_settings()

    valid_categories = {"all", "hospital", "pharmacy", "ambulance"}
    if category not in valid_categories:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"category must be one of: {', '.join(sorted(valid_categories))}",
        )

    # ── Cache lookup ──────────────────────────────────────────────────────
    key = _cache_key(latitude, longitude, category, radius_km)
    cached = _cache_get(key)
    if cached:
        logger.debug("Cache hit for nearby services key=%s", key[:8])
        return cached

    # ── Fetch from providers ──────────────────────────────────────────────
    services: list[dict[str, Any]] = []
    sources: set[str] = set()

    try:
        if category == "hospital":
            services = await _fetch_hospitals(latitude, longitude, radius_km, limit)
            if services:
                sources.add("geoapify")

        elif category == "pharmacy":
            services = await _fetch_pharmacies(latitude, longitude, radius_km, limit)
            if services:
                sources.add("google")

        elif category == "ambulance":
            services = await _fetch_ambulances(latitude, longitude, radius_km, limit)
            for s in services:
                sources.add(s.get("source", "google"))

        else:  # "all" — parallel fetch
            h_task = asyncio.create_task(
                _fetch_hospitals(latitude, longitude, radius_km, limit)
            )
            p_task = asyncio.create_task(
                _fetch_pharmacies(latitude, longitude, radius_km, limit)
            )
            a_task = asyncio.create_task(
                _fetch_ambulances(latitude, longitude, radius_km, limit)
            )
            results = await asyncio.gather(h_task, p_task, a_task, return_exceptions=True)

            for i, res in enumerate(results):
                cat_name = ("hospital", "pharmacy", "ambulance")[i]
                if isinstance(res, Exception):
                    # Hard errors (auth, config) should surface; transient ones skip category
                    msg = str(res)
                    if "not configured" in msg or "403" in msg or "401" in msg:
                        raise res
                    logger.warning("'all' fetch for %s failed: %s", cat_name, res)
                    continue
                services.extend(res)
                for s in res:
                    sources.add(s.get("source", "geoapify" if cat_name == "hospital" else "google"))

            # Deduplicate across categories (shouldn't overlap but be safe)
            services = _geo_dedup(services)
            services.sort(key=lambda s: s["distance_km"])

    except RuntimeError as exc:
        msg = str(exc)

        if "not configured" in msg or "not enabled" in msg:
            if settings.app_env.lower() not in ("production", "prod"):
                logger.info("Provider unavailable in dev — returning demo services")
                demo = get_demo_services(latitude, longitude, category, radius_km)
                return _build_payload(latitude, longitude, radius_km, demo, ["demo"])
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Nearby services are not configured on this server.",
            )

        if "quota exceeded" in msg or "429" in msg:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Nearby service rate limit exceeded. Please try again shortly.",
            )

        if "timed out" in msg or "timeout" in msg:
            raise HTTPException(
                status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                detail="Nearby service request timed out. Please try again.",
            )

        if "403" in msg:
            logger.error("Google Places 403: %s", msg)
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=(
                    "Nearby services are temporarily unavailable. "
                    "(Provider permission error — check API key, billing, and API enablement.)"
                ),
            )

        if "401" in msg or "invalid" in msg.lower():
            logger.error("Provider auth error: %s", msg)
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Nearby services are temporarily unavailable.",
            )

        logger.error("Provider error: %s", msg)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Nearby services are temporarily unavailable.",
        )

    payload = _build_payload(latitude, longitude, radius_km, services, sorted(sources))
    _cache_set(key, payload)
    return payload


def _build_payload(
    latitude: float,
    longitude: float,
    radius_km: float,
    services: list[dict[str, Any]],
    sources: list[str],
) -> dict[str, Any]:
    return {
        "services": services,
        "count": len(services),
        "latitude": latitude,
        "longitude": longitude,
        "radius_km": radius_km,
        "sources": sources,
    }
