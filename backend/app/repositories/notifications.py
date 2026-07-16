"""
app/repositories/notifications.py
Repository for public.notifications operations.

Security notes:
  - All queries filter by recipient_id / user_id to enforce ownership.
  - Direct INSERTs are blocked by RLS — use create_notification() RPC.
  - Mark-read operations use the secure RPC functions.
"""

from __future__ import annotations

import logging
from typing import Any

from supabase import Client

from app.repositories.base import BaseRepository
from app.schemas.notification import NotificationResponse

logger = logging.getLogger("medicare.repositories.notifications")


class NotificationRepository(BaseRepository):
    """Data access for the public.notifications table."""

    TABLE = "notifications"

    # ── Read ──────────────────────────────────────────────────────────────

    def list_for_user(
        self,
        user_id: str,
        limit: int = 20,
        offset: int = 0,
        is_read: bool | None = None,
        notification_type: str | None = None,
    ) -> list[NotificationResponse]:
        """Return notifications for the given user, newest first."""
        query = (
            self._admin()
            .table(self.TABLE)
            .select("*")
            .eq("recipient_id", user_id)
            .order("created_at", desc=True)
            .range(offset, offset + limit - 1)
        )
        if is_read is not None:
            query = query.eq("is_read", is_read)
        if notification_type:
            query = query.eq("type", notification_type)

        response = query.execute()
        return [NotificationResponse.model_validate(r) for r in (response.data or [])]

    def count_for_user(
        self,
        user_id: str,
        is_read: bool | None = None,
        notification_type: str | None = None,
    ) -> int:
        """Return total notification count matching the filters."""
        query = (
            self._admin()
            .table(self.TABLE)
            .select("id", count="exact")
            .eq("recipient_id", user_id)
        )
        if is_read is not None:
            query = query.eq("is_read", is_read)
        if notification_type:
            query = query.eq("type", notification_type)

        response = query.execute()
        return response.count or 0

    def get_unread_count_via_rpc(self, user_client: Client) -> int:
        """Use the secure RPC to count unread notifications."""
        result = user_client.rpc("get_unread_notification_count").execute()
        return result.data or 0

    # ── Write (via RPC only — direct INSERT blocked by RLS) ───────────────

    def mark_read_via_rpc(
        self, notification_id: str, user_client: Client
    ) -> dict[str, Any]:
        """Mark one notification as read via the secure RPC."""
        result = user_client.rpc(
            "mark_notification_read",
            {"p_notification_id": notification_id},
        ).execute()
        return result.data or {}

    def mark_all_read_via_rpc(self, user_client: Client) -> dict[str, Any]:
        """Mark all of the caller's notifications as read via the secure RPC."""
        result = user_client.rpc("mark_all_notifications_read").execute()
        return result.data or {}
