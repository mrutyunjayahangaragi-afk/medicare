"""
app/api/v1/routes/nearby.py
Nearby medical services endpoint using Geoapify Places API.

This endpoint provides nearby hospitals, pharmacies, and ambulance services
based on user location, with caching and database fallback for ambulance services.
"""

from __future__ import annotations

import asyncio
import hashlib
import logging
from typing import Any
from enum import Enum

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, Field

from app.core.config import get_settings
from app.integrations.geoapify_client import (
    GeoapifyClient,
    GeoapifyError,
    GeoapifyRateLimitError,
    GeoapifyTimeoutError,
    ServiceType,
    get_geoapify_client,
)

logger = logging.getLogger(__name__)

router = APIRouter()


class ServiceTypeRequest(str, Enum):
    """Service types for API requests."""
    ALL = "all"
    HOSPITAL = "hospital"
    PHARMACY = "pharmacy"
    AMBULANCE = "ambulance"


class NearbyServiceItem(BaseModel):
    """Normalized nearby service item."""
    id: str
    name: str
    type: str
    latitude: float
    longitude: float
    distance_meters: float
    distance_km: float
    address: str
    city: str
    phone: str | None = None
    website: str | None = None
    categories: list[str] = []
    source: str = "geoapify"


class NearbyResponse(BaseModel):
    """Response model for nearby services."""
    success: bool
    data: dict[str, Any]


# Simple in-memory cache (for production, use Redis)
_cache: dict[str, tuple[Any, float]] = {}
_cache_lock = asyncio.Lock()


def _generate_cache_key(
    lat: float,
    lon: float,
    service_type: str,
    radius: int,
    limit: int,
) -> str:
    """
    Generate cache key from request parameters.

    Rounds coordinates to 4 decimal places (~11m precision) to avoid
    caching exact user coordinates indefinitely.
    """
    rounded_lat = round(lat, 4)
    rounded_lon = round(lon, 4)
    key_str = f"{rounded_lat}:{rounded_lon}:{service_type}:{radius}:{limit}"
    return hashlib.md5(key_str.encode()).hexdigest()


async def _get_cached_response(cache_key: str) -> Any | None:
    """Get cached response if available and not expired."""
    async with _cache_lock:
        if cache_key in _cache:
            data, timestamp = _cache[cache_key]
            settings = get_settings()
            # Cache TTL: 2-5 minutes (use 3 minutes)
            if asyncio.get_event_loop().time() - timestamp < 180:
                logger.debug(f"Cache hit for key: {cache_key[:8]}...")
                return data
            else:
                # Expired, remove from cache
                del _cache[cache_key]
    return None


async def _set_cached_response(cache_key: str, data: Any) -> None:
    """Cache response with current timestamp."""
    async with _cache_lock:
        _cache[cache_key] = (data, asyncio.get_event_loop().time())
        # Limit cache size to prevent memory issues
        if len(_cache) > 1000:
            # Remove oldest entries
            oldest_keys = sorted(_cache.keys(), key=lambda k: _cache[k][1])[:100]
            for key in oldest_keys:
                del _cache[key]


async def _get_ambulance_from_database(
    lat: float,
    lon: float,
    radius: int,
    limit: int,
) -> dict[str, Any]:
    """
    Fallback: Get verified ambulance services from Medicare database.

    This is used when Geoapify returns no ambulance results.
    """
    # TODO: Implement database query for verified ambulance providers
    # For now, return empty results
    logger.info("Ambulance database fallback not yet implemented")
    return {
        "success": True,
        "data": {
            "items": [],
            "total": 0,
            "radius_meters": radius,
        },
    }


@router.get("", response_model=NearbyResponse)
async def search_nearby_services(
    lat: float = Query(..., ge=-90, le=90, description="Latitude"),
    lng: float = Query(..., ge=-180, le=180, description="Longitude"),
    type: ServiceTypeRequest = Query(default=ServiceTypeRequest.ALL, description="Service type"),
    radius: int = Query(default=5000, ge=500, le=10000, description="Search radius in meters"),
    limit: int = Query(default=30, ge=1, le=100, description="Maximum results"),
) -> NearbyResponse:
    """
    Search for nearby medical services using Geoapify Places API.

    Args:
        lat: User's latitude (-90 to 90)
        lng: User's longitude (-180 to 180)
        type: Service type (all, hospital, pharmacy, ambulance)
        radius: Search radius in meters (500 to 10000)
        limit: Maximum number of results (1 to 100)

    Returns:
        Normalized response with nearby services

    Raises:
        HTTPException: For various error conditions
    """
    settings = get_settings()

    # Check if Geoapify is enabled
    if not settings.geoapify_enabled:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Nearby service provider is temporarily unavailable",
        )

    # Generate cache key
    cache_key = _generate_cache_key(lat, lng, type.value, radius, limit)

    # Try cache first
    cached = await _get_cached_response(cache_key)
    if cached:
        return NearbyResponse(**cached)

    try:
        # Convert to client service type
        service_type = ServiceType(type.value)

        # Search Geoapify
        client = get_geoapify_client()
        response = await client.search_nearby(
            latitude=lat,
            longitude=lng,
            service_type=service_type,
            radius=radius,
            limit=limit,
        )

        # If ambulance search returned no results, try database fallback
        if (
            service_type == ServiceType.AMBULANCE
            and response["data"]["total"] == 0
        ):
            logger.info("No ambulance results from Geoapify, trying database fallback")
            db_response = await _get_ambulance_from_database(lat, lng, radius, limit)
            if db_response["data"]["total"] > 0:
                response = db_response

        # Cache the response
        await _set_cached_response(cache_key, response)

        return NearbyResponse(**response)

    except GeoapifyRateLimitError:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Nearby service rate limit exceeded. Please try again later.",
        )
    except GeoapifyTimeoutError:
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="Nearby service request timed out. Please try again.",
        )
    except GeoapifyError as e:
        logger.error(f"Geoapify error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to load nearby services. Please try again later.",
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        logger.error(f"Unexpected error in nearby search: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred. Please try again later.",
        )
