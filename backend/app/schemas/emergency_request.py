"""
app/schemas/emergency_request.py
API-level Pydantic schemas for emergency requests.

Distinct from app/schemas/database/emergency_request.py which mirrors the DB row.
These schemas control what the API exposes and accepts.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.schemas.database.emergency_request import (
    EmergencyRequestStatus,
    EmergencySeverity,
    EmergencyType,
)


# ── Create schema ─────────────────────────────────────────────────────────


class EmergencyRequestCreate(BaseModel):
    """Payload for creating a new emergency request.

    user_id is intentionally absent — it is always set from the token.
    status, assigned_responder_id and timestamps are server-controlled.
    extra="forbid" prevents clients from injecting unexpected fields.
    """

    emergency_type: EmergencyType
    severity: EmergencySeverity
    description: str = Field(min_length=10, max_length=500)
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    location_accuracy: float | None = Field(default=None, ge=0)
    manual_address: str | None = Field(default=None, max_length=500)
    contact_number: str = Field(min_length=7, max_length=20)
    evidence_path: str | None = None

    model_config = ConfigDict(extra="forbid")

    @model_validator(mode="after")
    def require_location_or_address(self) -> "EmergencyRequestCreate":
        has_gps = self.latitude is not None and self.longitude is not None
        has_address = bool(self.manual_address and self.manual_address.strip())
        if not has_gps and not has_address:
            raise ValueError(
                "Either GPS coordinates (latitude + longitude) or manual_address must be provided."
            )
        return self


# ── Response schema ───────────────────────────────────────────────────────


class EmergencyRequestResponse(BaseModel):
    """Safe emergency request fields returned to the request owner."""

    id: UUID
    user_id: UUID
    emergency_type: EmergencyType
    severity: EmergencySeverity
    description: str
    latitude: float | None = None
    longitude: float | None = None
    location_accuracy: float | None = None
    manual_address: str | None = None
    contact_number: str
    # evidence_path is NOT included — never expose raw storage paths
    status: EmergencyRequestStatus
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


# ── Filter schema ─────────────────────────────────────────────────────────


class EmergencyRequestFilters(BaseModel):
    """Query parameter filters for list endpoints."""

    status: EmergencyRequestStatus | None = None
    severity: EmergencySeverity | None = None
    emergency_type: EmergencyType | None = None
    search: str | None = Field(default=None, max_length=100)
