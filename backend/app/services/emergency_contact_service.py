"""
app/services/emergency_contact_service.py
Business logic for emergency contact management.
"""

from __future__ import annotations

import logging
from typing import Any

from fastapi import HTTPException, status
from supabase import Client

from app.repositories.emergency_contacts import EmergencyContactRepository
from app.schemas.emergency_contact import (
    EmergencyContactCreate,
    EmergencyContactPatch,
    EmergencyContactResponse,
    EmergencyContactUpdate,
)
from app.utils.phone import normalize_phone

logger = logging.getLogger("medicare.services.emergency_contacts")


class EmergencyContactService:
    """Orchestrates emergency contact CRUD with business rules."""

    def __init__(self, repo: EmergencyContactRepository | None = None) -> None:
        self._repo = repo or EmergencyContactRepository()

    def create_contact(
        self, user_id: str, payload: EmergencyContactCreate, user_client: Client
    ) -> EmergencyContactResponse:
        """Create a new emergency contact for the authenticated user.

        Normalises phone number and checks for duplicates.
        If is_primary is set, uses the secure RPC after creation.
        """
        # Normalise phone numbers
        try:
            payload.phone_number = normalize_phone(payload.phone_number) or payload.phone_number
            if payload.alternate_phone:
                payload.alternate_phone = normalize_phone(payload.alternate_phone) or payload.alternate_phone
        except ValueError as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e

        # Check for duplicate phone
        if self._repo.phone_exists_for_user(payload.phone_number, user_id):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A contact with this phone number already exists.",
            )

        # If user wants this as primary, create non-primary first then use RPC
        wants_primary = payload.is_primary
        payload.is_primary = False
        contact = self._repo.create(user_id, payload)

        if wants_primary:
            self._repo.set_primary_via_rpc(str(contact.id), user_client)
            # Re-fetch to get updated is_primary flag
            updated = self._repo.get_by_id(str(contact.id), user_id)
            return updated or contact

        return contact

    def set_primary_contact(
        self, contact_id: str, user_id: str, user_client: Client
    ) -> dict[str, Any]:
        """Atomically set one contact as primary using the secure RPC."""
        existing = self._repo.get_by_id(contact_id, user_id)
        if existing is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Emergency contact not found.",
            )

        result = self._repo.set_primary_via_rpc(contact_id, user_client)
        logger.info("Primary contact set to %s for user %s", contact_id, user_id)
        return result
