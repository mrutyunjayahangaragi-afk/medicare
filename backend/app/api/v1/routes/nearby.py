"""
app/api/v1/routes/nearby.py
Nearby medical services — proxies Geoapify Places API server-side.

GET /api/v1/nearby/services
  ?latitude=<float>
  &longitude=<float>
  &category=all|hospital|pharmacy|ambulance   (default: all)
  &radius_km=<float>                          (default: 10, max: 25)
  &limit=<int>                                (default: 50, max: 100)

Response (200):
  {
    "services": [ NearbyServiceItem, … ],
    "count":     <int>,
    "latitude":  <float>,
    "longitude": <float>,
    "radius_km": <float>
  }

Errors:
  503 — Geoapify not configured / API key missing
  429 — upstream rate limit
  504 — upstream timeout
  400 — bad request parameters

Security:
  - GEOAPIFY_API_KEY is used only here, never forwarded to the client.
  - Result is cached ~3 minutes (coordinates rounded to 3 dp ≈ 111 m).
"""

from __future__ import annotations

import asyncio
import hashlib
import logging
import time
from typing import Any

from fastapi import APIRouter, HTTPException, Query, status

from app.core.config import get_settings
from app.services.geoapify_service import fetch_nearby_services, get_demo_services

logger = logging.getLogger("medicare.routes.nearby")

router = APIRouter()

# ── In-process cache ──────────────────────────────────────────────────────
# Key → (payload, expires_at)
_CACHE: dict[str, tuple[dict[str, Any], float]] = {}
_CACHE_TTL = 180.0   # 3 minutes
_CACHE_MAX = 500     # prevent unbounded growth


def _cache_key(lat: float, lon: float, category: str, radius_km: float) -> str:
    # Round to 3 dp (~111 m) so nearby requests share a cache entry
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
        # Evict oldest 20 % of entries
        sorted_keys = sorted(_CACHE, key=lambda k: _CACHE[k][1])
        for k in sorted_keys[: _CACHE_MAX // 5]:
            _CACHE.pop(k, None)
    _CACHE[key] = (value, time.monotonic() + _CACHE_TTL)


# ── Endpoint ──────────────────────────────────────────────────────────────

@router.get(
    "/services",
    summary="Nearby medical services",
    description=(
        "Find hospitals, pharmacies and emergency services near a coordinate "
        "using the Geoapify Places API (server-side — API key never exposed to browser)."
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
    radius_km: float = Query(
        default=10.0,
        ge=1.0,
        le=25.0,
        description="Search radius in km (1 – 25)",
    ),
    limit: int = Query(
        default=50,
        ge=1,
        le=100,
        description="Maximum number of results",
    ),
) -> dict[str, Any]:
    settings = get_settings()

    # Validate category
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

    # ── Live Geoapify request ─────────────────────────────────────────────
    try:
        services = await fetch_nearby_services(
            latitude=latitude,
            longitude=longitude,
            category=category,
            radius_km=radius_km,
            limit=limit,
        )
    except RuntimeError as exc:
        msg = str(exc)

        # Not-configured — 503 with a safe message
        if "not configured" in msg or "not enabled" in msg:
            # Development fallback when Geoapify is unavailable
            if settings.app_env.lower() not in ("production", "prod"):
                logger.info("Geoapify unavailable in dev — returning demo services")
                services = get_demo_services(latitude, longitude, category, radius_km)
                payload = _build_payload(latitude, longitude, radius_km, services)
                # Don't cache demo data
                return payload
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Nearby services are not configured.",
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

    payload = _build_payload(latitude, longitude, radius_km, services)
    _cache_set(key, payload)
    return payload


def _build_payload(
    latitude: float,
    longitude: float,
    radius_km: float,
    services: list[dict[str, Any]],
) -> dict[str, Any]:
    return {
        "services": services,
        "count": len(services),
        "latitude": latitude,
        "longitude": longitude,
        "radius_km": radius_km,
    }
