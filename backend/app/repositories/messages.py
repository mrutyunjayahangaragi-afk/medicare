"""
app/repositories/messages.py
Repository for public.request_messages operations.

Security notes:
  - Messages are only accessible to the request owner or assigned responder.
  - send_request_message and mark_request_messages_read use secure RPCs.
  - Conversation participant checks rely on the RPC which verifies auth.uid().
"""

from __future__ import annotations

import logging
from typing import Any

from supabase import Client

from app.repositories.base import BaseRepository
from app.schemas.message import ConversationSummary, MessageResponse

logger = logging.getLogger("medicare.repositories.messages")


class MessageRepository(BaseRepository):
    """Data access for public.request_messages."""

    TABLE = "request_messages"

    # ── Read ──────────────────────────────────────────────────────────────

    def get_conversation(
        self, request_id: str, user_client: Client
    ) -> dict[str, Any]:
        """Use the secure RPC to fetch conversation messages.

        The RPC verifies that auth.uid() is a valid participant
        (request owner or assigned responder) before returning messages.
        """
        result = user_client.rpc(
            "get_request_conversation",
            {"p_request_id": request_id},
        ).execute()
        return result.data or {}

    def list_conversations_for_user(self, user_id: str) -> list[ConversationSummary]:
        """Return conversation summaries for requests where the user is a participant.

        Joins emergency_requests to get type, status, and participant info.
        Uses the admin client because this cross-table query requires elevated access.
        """
        # Requests where user is the owner
        owner_response = (
            self._admin()
            .table("emergency_requests")
            .select(
                "id, emergency_type, status, assigned_responder_id, updated_at"
            )
            .eq("user_id", user_id)
            .in_("status", ["pending", "accepted", "in_progress", "arrived"])
            .execute()
        )

        conversations: list[ConversationSummary] = []
        for req in owner_response.data or []:
            # Get latest message for each request
            msg_resp = (
                self._admin()
                .table(self.TABLE)
                .select("message, created_at, sender_id, is_read")
                .eq("request_id", req["id"])
                .order("created_at", desc=True)
                .limit(1)
                .execute()
            )
            latest = (msg_resp.data or [None])[0]

            # Count unread messages sent to this user
            unread_resp = (
                self._admin()
                .table(self.TABLE)
                .select("id", count="exact")
                .eq("request_id", req["id"])
                .eq("recipient_id", user_id)
                .eq("is_read", False)
                .execute()
            )

            conversations.append(
                ConversationSummary(
                    request_id=req["id"],
                    emergency_type=req["emergency_type"],
                    request_status=req["status"],
                    other_participant_name=None,  # resolved in service layer if needed
                    latest_message=latest["message"] if latest else None,
                    latest_message_at=latest["created_at"] if latest else None,
                    unread_count=unread_resp.count or 0,
                )
            )

        return conversations

    # ── Write (via RPC) ────────────────────────────────────────────────────

    def send_message_via_rpc(
        self,
        request_id: str,
        message_text: str,
        user_client: Client,
    ) -> dict[str, Any]:
        """Send a message using the secure RPC.

        The RPC verifies the caller is a valid participant and creates
        the notification for the recipient atomically.
        """
        result = user_client.rpc(
            "send_request_message",
            {
                "p_request_id": request_id,
                "p_message_text": message_text,
            },
        ).execute()
        return result.data or {}

    def mark_messages_read_via_rpc(
        self, request_id: str, user_client: Client
    ) -> dict[str, Any]:
        """Mark messages addressed to the caller as read (RPC)."""
        result = user_client.rpc(
            "mark_request_messages_read",
            {"p_request_id": request_id},
        ).execute()
        return result.data or {}
