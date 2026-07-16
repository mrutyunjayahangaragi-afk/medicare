"""
app/repositories/emergency_requests.py
Repository for public.emergency_requests operations.

Responsibilities:
  - Fetch requests for a given user (ordered newest first).
  - Fetch a single request by ID (with ownership check).
  - Create a new request.
  - All status transitions go through the secure Supabase RPC functions,
    not through direct table writes — this enforces the state machine.

Security notes:
  - Ownership is validated before any mutation.
  - Direct status updates bypass the state machine and are prohibited here.
  - Status transitions must call the RPC: update_emergency_request_status()
    or cancel_emergency_request().
"""

from __future__ import annotations

import logging
from typing import Any

from supabase import Client

from app.repositories.base import BaseRepository
from app.schemas.database.emergency_request import (
    EmergencyRequestCreate,
    EmergencyRequestRow,
)

logger = logging.getLogger("medicare.repositories.emergency_requests")


class EmergencyRequestRepository(BaseRepository):
    """Data access for the public.emergency_requests table."""

    TABLE = "emergency_requests"

    # ── Read ──────────────────────────────────────────────────────────────

    def list_for_user(
        self,
        user_id: str,
        limit: int = 50,
        offset: int = 0,
        status: str | None = None,
        severity: str | None = None,
        emergency_type: str | None = None,
        search: str | None = None,
    ) -> list[EmergencyRequestRow]:
        """Return the user's requests, newest first, with optional filters."""
        query = (
            self._admin()
            .table(self.TABLE)
            .select("*")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .range(offset, offset + limit - 1)
        )
        if status:
            query = query.eq("status", status)
        if severity:
            query = query.eq("severity", severity)
        if emergency_type:
            query = query.eq("emergency_type", emergency_type)
        if search:
            # Safe ilike pattern — PostgREST escapes special chars
            query = query.ilike("description", f"%{search}%")

        response = query.execute()
        return [EmergencyRequestRow.model_validate(r) for r in (response.data or [])]

    def count_for_user(
        self,
        user_id: str,
        status: str | None = None,
        severity: str | None = None,
        emergency_type: str | None = None,
        search: str | None = None,
    ) -> int:
        """Return total count matching the filters."""
        query = (
            self._admin()
            .table(self.TABLE)
            .select("id", count="exact")
            .eq("user_id", user_id)
        )
        if status:
            query = query.eq("status", status)
        if severity:
            query = query.eq("severity", severity)
        if emergency_type:
            query = query.eq("emergency_type", emergency_type)
        if search:
            query = query.ilike("description", f"%{search}%")

        response = query.execute()
        return response.count or 0

    def get_by_id(
        self,
        request_id: str,
        user_id: str | None = None,
    ) -> EmergencyRequestRow | None:
        """Fetch a single request.

        If user_id is provided, enforces ownership — returns None if the
        request exists but belongs to a different user.
        """
        query = (
            self._admin()
            .table(self.TABLE)
            .select("*")
            .eq("id", request_id)
        )
        if user_id:
            query = query.eq("user_id", user_id)

        response = query.maybe_single().execute()
        if response.data is None:
            return None
        return EmergencyRequestRow.model_validate(response.data)

    def list_pending_unassigned(
        self,
        limit: int = 50,
        offset: int = 0,
        severity: str | None = None,
        status: str | None = None,
    ) -> list[EmergencyRequestRow]:
        """Return pending, unassigned requests for responder dashboard.

        Ordered by severity (critical first) then creation time (oldest first).
        The severity ordering is done application-side after fetch because
        PostgREST does not support CASE-based ordering directly.
        """
        query = (
            self._admin()
            .table(self.TABLE)
            .select("*")
            .eq("status", status or "pending")
            .is_("assigned_responder_id", "null")
        )
        if severity:
            query = query.eq("severity", severity)

        response = query.order("created_at", desc=False).execute()
        rows = [EmergencyRequestRow.model_validate(r) for r in (response.data or [])]

        # Application-side severity sort: critical > high > medium > low
        _severity_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
        rows.sort(key=lambda r: _severity_order.get(r.severity.value, 99))

        return rows[offset : offset + limit]

    def list_assigned_to_responder(
        self,
        responder_id: str,
        limit: int = 50,
        offset: int = 0,
    ) -> list[EmergencyRequestRow]:
        """Return requests currently assigned to this responder."""
        response = (
            self._admin()
            .table(self.TABLE)
            .select("*")
            .eq("assigned_responder_id", responder_id)
            .in_("status", ["accepted", "in_progress", "arrived"])
            .order("created_at", desc=True)
            .range(offset, offset + limit - 1)
            .execute()
        )
        return [EmergencyRequestRow.model_validate(r) for r in (response.data or [])]

    def get_for_responder(
        self,
        request_id: str,
        responder_id: str,
    ) -> EmergencyRequestRow | None:
        """Fetch a request only if it is assigned to this responder or is pending/unassigned."""
        query = (
            self._admin()
            .table(self.TABLE)
            .select("*")
            .eq("id", request_id)
        )
        response = query.maybe_single().execute()
        if response.data is None:
            return None

        row = EmergencyRequestRow.model_validate(response.data)
        # Allow access if: assigned to this responder OR is pending & unassigned
        if row.assigned_responder_id and str(row.assigned_responder_id) != responder_id:
            return None
        return row

    # ── Write ─────────────────────────────────────────────────────────────

    def create(
        self,
        user_id: str,
        payload: "EmergencyRequestCreate",
    ) -> EmergencyRequestRow:
        """Insert a new emergency request row."""
        data: dict[str, Any] = payload.model_dump(exclude_none=True)
        data["user_id"] = user_id
        data["status"] = "pending"

        response = self._admin().table(self.TABLE).insert(data).execute()
        return EmergencyRequestRow.model_validate(response.data[0])

    def cancel_via_rpc(
        self,
        request_id: str,
        user_client: Client,
    ) -> dict[str, Any]:
        """Cancel a request using the secure Supabase RPC.

        Uses the user-scoped client so the RPC enforces ownership via auth.uid().
        """
        result = user_client.rpc(
            "cancel_emergency_request",
            {"p_request_id": request_id},
        ).execute()
        return result.data or {}

    def accept_via_rpc(
        self,
        request_id: str,
        user_client: Client,
    ) -> dict[str, Any]:
        """Accept a request via the secure RPC (atomic, prevents double-accept)."""
        result = user_client.rpc(
            "accept_emergency_request",
            {"request_id": request_id},
        ).execute()
        return result.data or {}

    def update_status_via_rpc(
        self,
        request_id: str,
        next_status: str,
        user_client: Client,
    ) -> dict[str, Any]:
        """Transition request status using the secure RPC."""
        result = user_client.rpc(
            "update_emergency_request_status",
            {"request_id": request_id, "next_status": next_status},
        ).execute()
        return result.data or {}

    def upsert_responder_location_via_rpc(
        self,
        request_id: str,
        latitude: float,
        longitude: float,
        heading: float | None,
        speed: float | None,
        accuracy: float | None,
        user_client: Client,
    ) -> dict[str, Any]:
        """Upsert the responder's latest location for a request via RPC."""
        params: dict[str, Any] = {
            "p_request_id": request_id,
            "p_latitude": latitude,
            "p_longitude": longitude,
        }
        if heading is not None:
            params["p_heading"] = heading
        if speed is not None:
            params["p_speed"] = speed
        if accuracy is not None:
            params["p_accuracy"] = accuracy

        result = user_client.rpc(
            "upsert_responder_location", params
        ).execute()
        return result.data or {}

    def get_responder_location(
        self,
        request_id: str,
    ) -> dict[str, Any] | None:
        """Return the latest responder location row for a request."""
        response = (
            self._admin()
            .table("responder_locations")
            .select("*")
            .eq("request_id", request_id)
            .maybe_single()
            .execute()
        )
        return response.data
