"""
app/api/v1/routes/nearby.py
Nearby medical services endpoint — powered exclusively by Geoapify.

GET /api/v1/nearby/services
  ?latitude=<float>
  &longitude=<float>
  &category=all|hospital|pharmacy|ambulance   (default: all)
  &radius_km=<float>                          (default: 10, max: 25)
  &limit=<int>                                (default: 50, max: 100)

Provider routing (all via Geoapify)
────────────────────────────────────
hospital  → Geoapify categories: healthcare.hospital, healthcare.clinic_or_praxis
pharmacy  → Geoapify categories: healthcare.pharmacy, commercial.health_and_beauty.pharmacy
ambulance → Geoapify categories: emergency, emergency.ambulance_station
            + Supabase approved ambulance_service org fallback
all       → all three above in parallel

Geoapify returns:
  pharmacy:  5 results (verified ✓)
  ambulance: 1 result  (sparse — Supabase fallback fills the gap)
  hospital:  5 results (unchanged ✓)

Response (200):
  {
    "services":  [ NearbyServiceItem, … ],
    "count":     <int>,
    "latitude":  <float>,
    "longitude": <float>,
    "radius_km": <float>,
    "sources":   ["geoapify" | "medicare"]
  }

Security:
  GEOAPIFY_API_KEY is used only here, never forwarded to the browser.

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
    get_ambulance_orgs_from_supabase,
    get_hospital_orgs_from_supabase,
    deduplicate_services,
    get_demo_services,
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


# ── Endpoint ──────────────────────────────────────────────────────────────

@router.get(
    "/services",
    summary="Nearby medical services (Geoapify)",
    description=(
        "Find hospitals, pharmacies and ambulance services near a coordinate "
        "using Geoapify Places API. API key is never forwarded to the browser. "
        "Ambulance results supplement live Geoapify data with verified "
        "organisations from the Medicare database."
    ),
    responses={
        200: {"description": "Services found (may be empty list)"},
        400: {"description": "Invalid parameters"},
        503: {"description": "Geoapify not configured"},
        429: {"description": "Rate limit exceeded"},
        504: {"description": "Upstream timeout"},
    },
)
async def get_nearby_services(
    latitude: float = Query(..., ge=-90.0, le=90.0, description="User latitude"),
    longitude: float = Query(..., ge=-180.0, le=180.0, description="User longitude"),
    category: str = Query(
        default="all",
        description="Service category: all | hospital | pharmacy | ambulance",
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

    # ── Fetch from Geoapify ───────────────────────────────────────────────
    try:
        services = await _geoapify_fetch(
            latitude=latitude,
            longitude=longitude,
            category=category,
            radius_km=radius_km,
            limit=limit,
        )
        logger.info(
            "Geoapify fetch: category=%s lat=%.4f lon=%.4f radius=%.1fkm -> %d results",
            category, latitude, longitude, radius_km, len(services),
        )
    except RuntimeError as exc:
        msg = str(exc)

        if "not configured" in msg or "not enabled" in msg:
            if settings.app_env.lower() not in ("production", "prod"):
                logger.info("Geoapify unavailable in dev — returning demo services")
                demo = get_demo_services(latitude, longitude, category, radius_km)
                return _build_payload(latitude, longitude, radius_km, demo, ["demo"])
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Nearby services are not configured on this server.",
            )

        if "rate limit" in msg or "429" in msg:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Nearby service rate limit exceeded. Please try again shortly.",
            )

        if "timed out" in msg or "timeout" in msg:
            raise HTTPException(
                status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                detail="Nearby service request timed out. Please try again.",
            )

        if "401" in msg or "invalid" in msg.lower():
            logger.error("Geoapify auth error: %s", msg)
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Nearby services are temporarily unavailable.",
            )

        logger.error("Geoapify error: %s", msg)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Nearby services are temporarily unavailable.",
        )

    # ── Supabase fallbacks ────────────────────────────────────────────────
    # Geoapify has sparse data in many regions of South Asia.
    # • ambulance: always supplement with verified ambulance_service orgs.
    # • pharmacy:  supplement with clinic orgs when Geoapify returns nothing
    #              (clinics in India commonly dispense medicine on-site).
    # • hospital:  supplement with verified hospital orgs when Geoapify
    #              returns nothing (protects against OSM coverage gaps).
    # Hospital and pharmacy fallbacks are NOT applied when Geoapify already
    # returned results — we trust live data when it exists.
    sources: list[str] = ["geoapify"] if services else []

    if category in ("ambulance", "all"):
        try:
            supabase_orgs = get_ambulance_orgs_from_supabase(
                latitude, longitude, radius_km
            )
            if supabase_orgs:
                logger.info(
                    "Supabase ambulance fallback: %d orgs merged", len(supabase_orgs)
                )
                combined = deduplicate_services(services + supabase_orgs)
                combined.sort(key=lambda s: s["distance_km"])
                services = combined
                sources.append("medicare")
        except Exception as exc:  # noqa: BLE001
            logger.warning("Supabase ambulance fallback failed: %s", exc)

    # Pharmacy fallback — only when Geoapify returned 0 pharmacy results
    geoapify_pharmacy_count = sum(
        1 for s in services if s.get("category") == "pharmacy"
    )
    if category in ("pharmacy", "all") and geoapify_pharmacy_count == 0:
        try:
            supabase_pharm = get_hospital_orgs_from_supabase(
                latitude, longitude, category="pharmacy", radius_km=radius_km
            )
            if supabase_pharm:
                logger.info(
                    "Supabase pharmacy/clinic fallback: %d orgs merged",
                    len(supabase_pharm),
                )
                combined = deduplicate_services(services + supabase_pharm)
                combined.sort(key=lambda s: s["distance_km"])
                services = combined
                if "medicare" not in sources:
                    sources.append("medicare")
        except Exception as exc:  # noqa: BLE001
            logger.warning("Supabase pharmacy fallback failed: %s", exc)

    # Hospital fallback — only when Geoapify returned 0 hospital results
    geoapify_hospital_count = sum(
        1 for s in services if s.get("category") == "hospital"
    )
    if category in ("hospital", "all") and geoapify_hospital_count == 0:
        try:
            supabase_hosp = get_hospital_orgs_from_supabase(
                latitude, longitude, category="hospital", radius_km=radius_km
            )
            if supabase_hosp:
                logger.info(
                    "Supabase hospital fallback: %d orgs merged", len(supabase_hosp)
                )
                combined = deduplicate_services(services + supabase_hosp)
                combined.sort(key=lambda s: s["distance_km"])
                services = combined
                if "medicare" not in sources:
                    sources.append("medicare")
        except Exception as exc:  # noqa: BLE001
            logger.warning("Supabase hospital fallback failed: %s", exc)

    if services and "geoapify" not in sources:
        sources.append("geoapify")

    payload = _build_payload(latitude, longitude, radius_km, services, sorted(set(sources)))
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
