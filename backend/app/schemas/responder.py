"""
app/schemas/responder.py
API-level Pydantic schemas for responder-specific endpoints.
"""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.database.profile import AvailabilityStatus


# ── Response schemas ──────────────────────────────────────────────────────


class ResponderRequestResponse(BaseModel):
    """Emergency request as seen by a responder."""

    id: UUID
    user_id: UUID
    emergency_type: str
    severity: str
    description: str
    latitude: float | None = None
    longitude: float | None = None
    location_accuracy: float | None = None
    manual_address: str | None = None
    contact_number: str
    status: str
    assigned_responder_id: UUID | None = None
    assigned_at: datetime | None = None
    accepted_at: datetime | None = None
    in_progress_at: datetime | None = None
    arrived_at: datetime | None = None
    completed_at: datetime | None = None
    cancelled_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ResponderLocationResponse(BaseModel):
    """Latest responder location for a request."""

    id: UUID
    responder_id: UUID
    request_id: UUID
    latitude: float
    longitude: float
    heading: float | None = None
    speed: float | None = None
    accuracy: float | None = None
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ── Input schemas ─────────────────────────────────────────────────────────


class AvailabilityUpdateRequest(BaseModel):
    """Responder availability update payload."""

    availability_status: AvailabilityStatus

    model_config = ConfigDict(extra="forbid")


class LocationUpdateRequest(BaseModel):
    """Responder GPS location update for an active request."""

    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    heading: float | None = Field(default=None, ge=0, le=360)
    speed: float | None = Field(default=None, ge=0)
    accuracy: float | None = Field(default=None, ge=0)

    model_config = ConfigDict(extra="forbid")
