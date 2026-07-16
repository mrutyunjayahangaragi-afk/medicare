"""
app/integrations/geoapify_client.py
Geoapify Places API client for nearby medical services.

This module handles all communication with the Geoapify Places API,
including category mapping, error normalization, and secure API key handling.
The API key is never exposed to the browser or logged.
"""

from __future__ import annotations

import asyncio
import logging
from typing import Any, Literal
from enum import Enum

import httpx

from app.core.config import get_settings

logger = logging.getLogger(__name__)


class ServiceType(str, Enum):
    """Medical service types supported by the Medicare platform."""
    ALL = "all"
    HOSPITAL = "hospital"
    PHARMACY = "pharmacy"
    AMBULANCE = "ambulance"


class GeoapifyError(Exception):
    """Base exception for Geoapify-related errors."""
    pass


class GeoapifyRateLimitError(GeoapifyError):
    """Raised when Geoapify rate limit is exceeded."""
    pass


class GeoapifyTimeoutError(GeoapifyError):
    """Raised when Geoapify request times out."""
    pass


class GeoapifyAuthenticationError(GeoapifyError):
    """Raised when Geoapify API key is invalid."""
    pass


class GeoapifyProviderError(GeoapifyError):
    """Raised for general Geoapify provider errors."""
    pass


# Geoapify category mapping based on official documentation
# https://apidocs.geoapify.com/docs/places/nearby-search
CATEGORY_MAPPING: dict[ServiceType, list[str]] = {
    ServiceType.HOSPITAL: [
        "healthcare.hospital",
        "healthcare.clinic",
        "healthcare",
    ],
    ServiceType.PHARMACY: [
        "commercial.health_and_beauty.pharmacy",
    ],
    ServiceType.AMBULANCE: [
        "service.emergency",
        "healthcare.hospital",  # Fallback: hospitals with emergency services
        "healthcare.clinic",   # Fallback: clinics with emergency services
    ],
    ServiceType.ALL: [
        "healthcare.hospital",
        "healthcare.clinic",
        "healthcare",
        "commercial.health_and_beauty.pharmacy",
        "service.emergency",
    ],
}


class GeoapifyClient:
    """Client for Geoapify Places API with secure key handling and error normalization."""

    def __init__(self) -> None:
        self.settings = get_settings()
        self._client: httpx.AsyncClient | None = None

    @property
    def client(self) -> httpx.AsyncClient:
        """Lazy-initialize async HTTP client."""
        if self._client is None:
            self._client = httpx.AsyncClient(timeout=self.settings.geoapify_timeout_seconds)
        return self._client

    def _is_enabled(self) -> bool:
        """Check if Geoapify integration is enabled."""
        return self.settings.geoapify_enabled and bool(self.settings.geoapify_api_key)

    def _get_categories(self, service_type: ServiceType) -> list[str]:
        """Get Geoapify categories for a service type."""
        return CATEGORY_MAPPING.get(service_type, CATEGORY_MAPPING[ServiceType.ALL])

    async def search_nearby(
        self,
        latitude: float,
        longitude: float,
        service_type: ServiceType = ServiceType.ALL,
        radius: int = 5000,
        limit: int = 30,
    ) -> dict[str, Any]:
        """
        Search for nearby medical services using Geoapify Places API.

        Args:
            latitude: User's latitude (-90 to 90)
            longitude: User's longitude (-180 to 180)
            service_type: Type of medical service to search
            radius: Search radius in meters (500 to 10000)
            limit: Maximum number of results (1 to 100)

        Returns:
            Normalized response with service items

        Raises:
            GeoapifyError: For various Geoapify-specific errors
            ValueError: For invalid input parameters
        """
        if not self._is_enabled():
            raise GeoapifyError("Geoapify integration is not enabled")

        # Validate inputs
        if not -90 <= latitude <= 90:
            raise ValueError("Latitude must be between -90 and 90")
        if not -180 <= longitude <= 180:
            raise ValueError("Longitude must be between -180 and 180")
        if not 500 <= radius <= 10000:
            raise ValueError("Radius must be between 500 and 10000 meters")
        if not 1 <= limit <= 100:
            raise ValueError("Limit must be between 1 and 100")

        # Get categories for service type
        categories = self._get_categories(service_type)
        categories_param = ",".join(categories)

        # Build API URL (never log the full URL with API key)
        base_url = "https://api.geoapify.com/v2/places"
        params = {
            "categories": categories_param,
            "filter": f"circle:{longitude},{latitude},{radius}",
            "limit": str(limit),
            "apiKey": self.settings.geoapify_api_key,  # Key added here, never logged
        }

        try:
            response = await self.client.get(base_url, params=params)
            response.raise_for_status()
            data = response.json()

            # Normalize response
            return self._normalize_response(data, latitude, longitude, service_type)

        except httpx.HTTPStatusError as e:
            if e.response.status_code == 401:
                raise GeoapifyAuthenticationError("Invalid Geoapify API key")
            elif e.response.status_code == 429:
                raise GeoapifyRateLimitError("Geoapify rate limit exceeded")
            else:
                raise GeoapifyProviderError(f"Geoapify provider error: {e.response.status_code}")
        except httpx.TimeoutException:
            raise GeoapifyTimeoutError("Geoapify request timed out")
        except httpx.HTTPError as e:
            raise GeoapifyProviderError(f"Geoapify HTTP error: {str(e)}")
        except Exception as e:
            raise GeoapifyError(f"Unexpected Geoapify error: {str(e)}")

    def _normalize_response(
        self,
        raw_data: dict[str, Any],
        user_lat: float,
        user_lon: float,
        service_type: ServiceType,
    ) -> dict[str, Any]:
        """
        Normalize Geoapify response to Medicare format.

        Args:
            raw_data: Raw Geoapify API response
            user_lat: User's latitude for distance calculation
            user_lon: User's longitude for distance calculation
            service_type: Service type being searched

        Returns:
            Normalized response with Medicare structure
        """
        features = raw_data.get("features", [])
        items = []

        for feature in features:
            properties = feature.get("properties", {})
            geometry = feature.get("geometry", {})
            coordinates = geometry.get("coordinates", [0, 0])

            # Geoapify returns [longitude, latitude]
            place_lon, place_lat = coordinates[0], coordinates[1]

            # Calculate distance if not provided by API
            distance_meters = properties.get("distance")
            if distance_meters is None:
                distance_meters = self._haversine_distance(user_lat, user_lon, place_lat, place_lon)

            # Determine service type from categories
            categories = properties.get("categories", [])
            place_type = self._infer_service_type(categories, service_type)

            # Build normalized item
            item = {
                "id": properties.get("place_id", f"geoapify_{feature.get('id', '')}"),
                "name": properties.get("name", "Unknown"),
                "type": place_type,
                "latitude": place_lat,
                "longitude": place_lon,
                "distance_meters": distance_meters,
                "distance_km": round(distance_meters / 1000, 2),
                "address": self._format_address(properties),
                "city": properties.get("city", ""),
                "phone": properties.get("contact", {}).get("phone"),
                "website": properties.get("contact", {}).get("website"),
                "categories": categories,
                "source": "geoapify",
            }
            items.append(item)

        # Sort by distance (nearest first)
        items.sort(key=lambda x: x["distance_meters"])

        return {
            "success": True,
            "data": {
                "items": items,
                "total": len(items),
                "radius_meters": raw_data.get("properties", {}).get("radius", 0),
            },
        }

    def _infer_service_type(
        self,
        categories: list[str],
        requested_type: ServiceType,
    ) -> str:
        """
        Infer service type from Geoapify categories.

        Args:
            categories: List of Geoapify categories
            requested_type: The service type being searched

        Returns:
            Inferred service type (hospital, pharmacy, ambulance)
        """
        category_str = " ".join(categories).lower()

        # Check for ambulance indicators
        if "emergency" in category_str or "ambulance" in category_str:
            return "ambulance"

        # Check for pharmacy indicators
        if "pharmacy" in category_str:
            return "pharmacy"

        # Check for hospital/clinic indicators
        if "hospital" in category_str or "clinic" in category_str:
            return "hospital"

        # Default to requested type if no clear indicators
        if requested_type != ServiceType.ALL:
            return requested_type.value

        # Final fallback
        return "hospital"

    def _format_address(self, properties: dict[str, Any]) -> str:
        """Format address from Geoapify properties."""
        parts = [
            properties.get("street"),
            properties.get("housenumber"),
            properties.get("postcode"),
            properties.get("city"),
            properties.get("country"),
        ]
        return ", ".join(filter(None, parts))

    def _haversine_distance(
        self,
        lat1: float,
        lon1: float,
        lat2: float,
        lon2: float,
    ) -> float:
        """
        Calculate distance between two points using Haversine formula.

        Args:
            lat1, lon1: First point coordinates
            lat2, lon2: Second point coordinates

        Returns:
            Distance in meters
        """
        from math import asin, cos, radians, sin, sqrt

        R = 6371000  # Earth's radius in meters

        lat1_rad = radians(lat1)
        lat2_rad = radians(lat2)
        delta_lat = radians(lat2 - lat1)
        delta_lon = radians(lon2 - lon1)

        a = (
            sin(delta_lat / 2) ** 2
            + cos(lat1_rad) * cos(lat2_rad) * sin(delta_lon / 2) ** 2
        )
        c = 2 * asin(sqrt(a))

        return R * c

    async def close(self) -> None:
        """Close the HTTP client."""
        if self._client:
            await self._client.aclose()
            self._client = None


# Singleton instance
_geoapify_client: GeoapifyClient | None = None


def get_geoapify_client() -> GeoapifyClient:
    """Get or create the Geoapify client singleton."""
    global _geoapify_client
    if _geoapify_client is None:
        _geoapify_client = GeoapifyClient()
    return _geoapify_client
