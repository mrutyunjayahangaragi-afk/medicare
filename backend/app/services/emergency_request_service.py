"""
app/services/emergency_request_service.py
Business logic for emergency request lifecycle.

All status transitions go through secure RPC functions.
The service layer enforces business rules on top of the repository.
"""

from __future__ import annotations

import logging
from typing import Any

from fastapi import HTTPException, status
from supabase import Client

from app.repositories.emergency_requests import EmergencyRequestRepository
from app.schemas.database.emergency_request import EmergencyRequestRow
from app.schemas.emergency_request import EmergencyRequestCreate

logger = logging.getLogger("medicare.services.emergency_requests")

# Map of responder action path segment → next status
_ACTION_STATUS_MAP: dict[str, str] = {
    "start": "in_progress",
    "arrive": "arrived",
    "complete": "completed",
}


class EmergencyRequestService:
    """Orchestrates emergency request creation and lifecycle transitions."""

    def __init__(self, repo: EmergencyRequestRepository | None = None) -> None:
        self._repo = repo or EmergencyRequestRepository()

    def create_request(
        self,
        user_id: str,
        payload: EmergencyRequestCreate,
    ) -> EmergencyRequestRow:
        """Create a new emergency request for the authenticated user.

        user_id is always taken from the validated token — never from payload.
        """
        row = self._repo.create(user_id=user_id, payload=payload)
        logger.info("Emergency request %s created for user %s", row.id, user_id)
        return row

    def cancel_request(
        self,
        request_id: str,
        user_id: str,
        user_client: Client,
    ) -> dict[str, Any]:
        """Cancel a request owned by the user via the secure RPC.

        First checks ownership so we return 404 instead of a confusing RPC error
        when the request doesn't belong to this user.
        """
        existing = self._repo.get_by_id(request_id, user_id=user_id)
        if existing is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Emergency request not found.",
            )

        if existing.status.is_terminal:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Request is already {existing.status.value} and cannot be cancelled.",
            )

        result = self._repo.cancel_via_rpc(request_id, user_client)
        logger.info("Emergency request %s cancelled by user %s", request_id, user_id)
        return result

    def accept_request(
        self,
        request_id: str,
        responder_id: str,
        user_client: Client,
    ) -> dict[str, Any]:
        """Accept a pending request as a responder via the secure RPC."""
        result = self._repo.accept_via_rpc(request_id, user_client)
        logger.info(
            "Emergency request %s accepted by responder %s", request_id, responder_id
        )
        return result

    def transition_status(
        self,
        request_id: str,
        action: str,
        responder_id: str,
        user_client: Client,
    ) -> dict[str, Any]:
        """Advance request status via responder action (start/arrive/complete).

        The action is mapped to the target status — raw status values are never
        accepted from the client through this path.
        """
        next_status = _ACTION_STATUS_MAP.get(action)
        if next_status is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unknown action '{action}'.",
            )

        # Verify the responder is actually assigned to this request
        row = self._repo.get_by_id(request_id)
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

        # Validate transition before calling the DB
        allowed = row.status.allowed_next()
        from app.schemas.database.emergency_request import EmergencyRequestStatus
        target = EmergencyRequestStatus(next_status)
        if target not in allowed:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Cannot transition from '{row.status.value}' to '{next_status}'. "
                    f"Allowed next states: {[s.value for s in allowed]}."
                ),
            )

        result = self._repo.update_status_via_rpc(request_id, next_status, user_client)
        logger.info(
            "Request %s status → %s by responder %s", request_id, next_status, responder_id
        )
        return result
