"""
app/services/message_service.py
Business logic for request messages and conversations.
"""

from __future__ import annotations

import logging
from typing import Any

from fastapi import HTTPException, status
from supabase import Client

from app.repositories.messages import MessageRepository

logger = logging.getLogger("medicare.services.messages")


class MessageService:
    """Orchestrates message sending and conversation access."""

    def __init__(self, repo: MessageRepository | None = None) -> None:
        self._repo = repo or MessageRepository()

    def send_message(
        self,
        request_id: str,
        message_text: str,
        user_client: Client,
    ) -> dict[str, Any]:
        """Send a message to a request conversation via the secure RPC.

        The RPC enforces that the caller is a valid participant and prevents
        arbitrary recipient_id spoofing.
        """
        result = self._repo.send_message_via_rpc(request_id, message_text, user_client)
        if not result.get("success"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not a participant in this conversation.",
            )
        logger.info("Message sent to request %s", request_id)
        return result

    def get_conversation(
        self,
        request_id: str,
        user_client: Client,
    ) -> dict[str, Any]:
        """Return conversation messages for a request.

        The RPC verifies participant access before returning messages.
        """
        result = self._repo.get_conversation(request_id, user_client)
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found or you are not a participant.",
            )
        return result

    def mark_messages_read(
        self,
        request_id: str,
        user_client: Client,
    ) -> dict[str, Any]:
        """Mark messages addressed to the caller as read."""
        return self._repo.mark_messages_read_via_rpc(request_id, user_client)
