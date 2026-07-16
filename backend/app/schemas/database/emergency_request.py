"""
app/schemas/database/emergency_request.py
Pydantic schemas mirroring the public.emergency_requests table.
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


# ── Enums ─────────────────────────────────────────────────────────────────

class EmergencyType(str, Enum):
    """Valid emergency types — mirrors emergency_type_enum in PostgreSQL."""
    medical       = "medical"
    accident      = "accident"
    fire          = "fire"
    crime         = "crime"
    flood         = "flood"
    electric      = "electric"
    child_safety  = "child_safety"
    elder_care    = "elder_care"
    animal_attack = "animal_attack"
    other         = "other"


class EmergencySeverity(str, Enum):
    """Severity levels — mirrors severity_level_enum."""
    low      = "low"
    medium   = "medium"
    high     = "high"
    critical = "critical"


class EmergencyRequestStatus(str, Enum):
    """Request lifecycle states — mirrors emergency_status_enum.

    Allowed transitions (enforced by update_emergency_request_status RPC):
        pending     → accepted | cancelled
        accepted    → in_progress | cancelled
        in_progress → arrived | completed | cancelled
        arrived     → completed | cancelled
        completed   → (terminal)
        cancelled   → (terminal)
    """
    pending            = "pending"
    accepted           = "accepted"
    in_progress        = "in_progress"
    arrived            = "arrived"
    volunteer_assigned = "volunteer_assigned"   # legacy — kept for compatibility
    hospital_assigned  = "hospital_assigned"    # legacy — kept for compatibility
    completed          = "completed"
    cancelled          = "cancelled"

    # ── Transition helpers ───────────────────────────────────────────────

    @property
    def is_terminal(self) -> bool:
        return self in {self.completed, self.cancelled}

    def allowed_next(self) -> frozenset[EmergencyRequestStatus]:
        """Return the set of valid next states from this state."""
        transitions: dict[str, frozenset[EmergencyRequestStatus]] = {
            "pending":     frozenset({self.accepted,     self.cancelled}),
            "accepted":    frozenset({self.in_progress,  self.cancelled}),
            "in_progress": frozenset({self.arrived, self.completed, self.cancelled}),
            "arrived":     frozenset({self.completed,    self.cancelled}),
            "completed":   frozenset(),
            "cancelled":   frozenset(),
        }
        return transitions.get(self.value, frozenset())


# ── Row schema (matches DB columns exactly) ───────────────────────────────

class EmergencyRequestRow(BaseModel):
    """Full database row for public.emergency_requests."""

    id:                   UUID
    user_id:              UUID
    emergency_type:       EmergencyType
    severity:             EmergencySeverity
    description:          str
    latitude:             float | None = None
    longitude:            float | None = None
    location_accuracy:    float | None = None
    manual_address:       str   | None = None
    contact_number:       str
    evidence_path:        str   | None = None
    status:               EmergencyRequestStatus
    assigned_responder_id: UUID | None = None
    assigned_at:          datetime | None = None
    accepted_at:          datetime | None = None
    in_progress_at:       datetime | None = None
    arrived_at:           datetime | None = None
    completed_at:         datetime | None = None
    cancelled_at:         datetime | None = None
    created_at:           datetime
    updated_at:           datetime

    model_config = {"from_attributes": True}


# ── Create payload ────────────────────────────────────────────────────────

class EmergencyRequestCreate(BaseModel):
    """Payload for creating a new emergency request."""

    emergency_type:    EmergencyType
    severity:          EmergencySeverity
    description:       str = Field(min_length=10, max_length=500)
    latitude:          float | None = Field(default=None, ge=-90,  le=90)
    longitude:         float | None = Field(default=None, ge=-180, le=180)
    location_accuracy: float | None = None
    manual_address:    str   | None = Field(default=None, max_length=500)
    contact_number:    str   = Field(min_length=7,  max_length=20)
    evidence_path:     str   | None = None

    def model_post_init(self, __context: Any) -> None:
        has_gps     = self.latitude is not None and self.longitude is not None
        has_address = bool(self.manual_address and self.manual_address.strip())
        if not has_gps and not has_address:
            raise ValueError(
                "Either GPS coordinates (latitude + longitude) or "
                "manual_address must be provided."
            )
