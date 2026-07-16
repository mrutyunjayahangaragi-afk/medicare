"""
app/services/responder_service.py
Business logic for responder-specific operations.
"""

from __future__ import annotations

import logging
from typing import Any

from fastapi import HTTPException, status
from supabase import Client

from app.repositories.emergency_requests import EmergencyRequestRepository
from app.repositories.profiles import ProfileRepository
from app.schemas.database.profile import AvailabilityStatus

logger = logging.getLogger("medicare.services.responder")


class ResponderService:
    """Handles responder-specific business rules."""

    def __init__(
        self,
        req_repo: EmergencyRequestRepository | None = None,
        profile_repo: ProfileRepository | None = None,
    ) -> None:
        self._req_repo = req_repo or EmergencyRequestRepository()
        self._profile_repo = profile_repo or ProfileRepository()

    def update_availability(
        self,
        responder_id: str,
        new_status: AvailabilityStatus,
        user_client: Client,
    ) -> bool:
        """Update the authenticated responder's availability via RPC."""
        result = user_client.rpc(
            "update_responder_availability",
            {"new_status": new_status.value},
        ).execute()
        logger.info(
            "Responder %s availability → %s", responder_id, new_status.value
        )
        return bool(result.data)

    def update_location(
        self,
        request_id: str,
        responder_id: str,
        latitude: float,
        longitude: float,
        heading: float | None,
        speed: float | None,
        accuracy: float | None,
        user_client: Client,
    ) -> dict[str, Any]:
        """Update the responder's location for an active request.

        Only the assigned responder may update this location.
        """
        # Verify assignment before updating location
        row = self._req_repo.get_by_id(request_id)
        if row is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Emergency request not found.",
            )
        if str(row.assigned_responder_id) != responder_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not assigned to this request.",
            )

        result = self._req_repo.upsert_responder_location_via_rpc(
            request_id=request_id,
            latitude=latitude,
            longitude=longitude,
            heading=heading,
            speed=speed,
            accuracy=accuracy,
            user_client=user_client,
        )
        return result

    def get_location(
        self,
        request_id: str,
        caller_id: str,
    ) -> dict[str, Any] | None:
        """Return the latest responder location.

        Accessible by: the request owner OR the assigned responder.
        """
        row = self._req_repo.get_by_id(request_id)
        if row is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Emergency request not found.",
            )

        # Check caller is owner or assigned responder
        is_owner = str(row.user_id) == caller_id
        is_responder = row.assigned_responder_id and str(row.assigned_responder_id) == caller_id
        if not is_owner and not is_responder:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied.",
            )

        return self._req_repo.get_responder_location(request_id)
