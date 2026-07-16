"""
app/schemas/message.py
API-level Pydantic schemas for request messages and conversations.
"""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


# ── Response schemas ──────────────────────────────────────────────────────


class MessageResponse(BaseModel):
    """Safe message fields returned to conversation participants."""

    id: UUID
    request_id: UUID
    sender_id: UUID
    recipient_id: UUID
    message: str
    message_type: str = "text"
    is_read: bool = False
    read_at: datetime | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ConversationSummary(BaseModel):
    """Summary of a conversation thread for the conversations list."""

    request_id: UUID
    emergency_type: str
    request_status: str
    other_participant_name: str | None = None
    latest_message: str | None = None
    latest_message_at: datetime | None = None
    unread_count: int = 0


# ── Input schemas ─────────────────────────────────────────────────────────


class SendMessageRequest(BaseModel):
    """Payload for sending a message to a request conversation."""

    message: str = Field(min_length=1, max_length=1000)

    model_config = ConfigDict(extra="forbid")
