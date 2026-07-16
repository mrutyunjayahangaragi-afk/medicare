"""
app/schemas/notification.py
API-level Pydantic schemas for notifications.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict


# ── Response schema ───────────────────────────────────────────────────────


class NotificationResponse(BaseModel):
    """Safe notification fields returned to the recipient."""

    id: UUID
    recipient_id: UUID | None = None
    user_id: UUID | None = None
    request_id: UUID | None = None
    actor_id: UUID | None = None
    type: str | None = None
    title: str | None = None
    message: str | None = None
    data: Any | None = None
    is_read: bool = False
    read_at: datetime | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UnreadCountResponse(BaseModel):
    """Unread notification count."""

    unread_count: int
