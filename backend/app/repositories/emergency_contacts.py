"""
app/repositories/emergency_contacts.py
Repository for public.emergency_contacts operations.

Security notes:
  - All queries always filter by user_id to enforce ownership.
  - The set_primary operation uses the secure RPC to ensure atomicity.
  - Direct manipulation of is_primary on multiple rows is never done here.
"""

from __future__ import annotations

import logging
from typing import Any

from supabase import Client

from app.repositories.base import BaseRepository
from app.schemas.emergency_contact import (
    EmergencyContactCreate,
    EmergencyContactPatch,
    EmergencyContactResponse,
    EmergencyContactUpdate,
)

logger = logging.getLogger("medicare.repositories.emergency_contacts")


class EmergencyContactRepository(BaseRepository):
    """Data access for the public.emergency_contacts table."""

    TABLE = "emergency_contacts"

    # ── Read ──────────────────────────────────────────────────────────────

    def list_for_user(self, user_id: str) -> list[EmergencyContactResponse]:
        """Return all contacts for the user, primary first."""
        response = (
            self._admin()
            .table(self.TABLE)
            .select("*")
            .eq("user_id", user_id)
            .order("is_primary", desc=True)
            .order("created_at", desc=True)
            .execute()
        )
        return [EmergencyContactResponse.model_validate(r) for r in (response.data or [])]

    def get_by_id(
        self, contact_id: str, user_id: str
    ) -> EmergencyContactResponse | None:
        """Fetch a single contact, enforcing ownership via user_id filter."""
        response = (
            self._admin()
            .table(self.TABLE)
            .select("*")
            .eq("id", contact_id)
            .eq("user_id", user_id)
            .maybe_single()
            .execute()
        )
        if response.data is None:
            return None
        return EmergencyContactResponse.model_validate(response.data)

    def phone_exists_for_user(self, phone: str, user_id: str, exclude_id: str | None = None) -> bool:
        """Check if a phone number already exists for this user."""
        query = (
            self._admin()
            .table(self.TABLE)
            .select("id")
            .eq("user_id", user_id)
            .eq("phone_number", phone)
        )
        if exclude_id:
            query = query.neq("id", exclude_id)

        response = query.maybe_single().execute()
        return response.data is not None

    # ── Write ─────────────────────────────────────────────────────────────

    def create(
        self, user_id: str, payload: EmergencyContactCreate
    ) -> EmergencyContactResponse:
        """Insert a new emergency contact row."""
        data: dict[str, Any] = payload.model_dump(exclude_none=True)
        data["user_id"] = user_id

        response = self._admin().table(self.TABLE).insert(data).execute()
        return EmergencyContactResponse.model_validate(response.data[0])

    def update(
        self, contact_id: str, user_id: str, payload: EmergencyContactUpdate
    ) -> EmergencyContactResponse | None:
        """Full update — replace all writable fields."""
        data = payload.model_dump(exclude_none=False)
        response = (
            self._admin()
            .table(self.TABLE)
            .update(data)
            .eq("id", contact_id)
            .eq("user_id", user_id)
            .execute()
        )
        if not response.data:
            return None
        return EmergencyContactResponse.model_validate(response.data[0])

    def patch(
        self, contact_id: str, user_id: str, payload: EmergencyContactPatch
    ) -> EmergencyContactResponse | None:
        """Partial update — apply only provided fields."""
        data = payload.model_dump(exclude_none=True)
        if not data:
            return self.get_by_id(contact_id, user_id)

        response = (
            self._admin()
            .table(self.TABLE)
            .update(data)
            .eq("id", contact_id)
            .eq("user_id", user_id)
            .execute()
        )
        if not response.data:
            return None
        return EmergencyContactResponse.model_validate(response.data[0])

    def delete(self, contact_id: str, user_id: str) -> bool:
        """Delete a contact owned by the user. Returns True if deleted."""
        response = (
            self._admin()
            .table(self.TABLE)
            .delete()
            .eq("id", contact_id)
            .eq("user_id", user_id)
            .execute()
        )
        return bool(response.data)

    def set_primary_via_rpc(
        self, contact_id: str, user_client: Client
    ) -> dict[str, Any]:
        """Use the secure RPC to atomically set one contact as primary.

        The user client ensures auth.uid() in the RPC matches the contact owner.
        """
        result = user_client.rpc(
            "set_primary_emergency_contact",
            {"p_contact_id": contact_id},
        ).execute()
        return result.data or {}
