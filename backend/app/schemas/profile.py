"""
app/schemas/profile.py
API-level Pydantic schemas for user profiles.

Distinct from app/schemas/database/profile.py which mirrors the DB row.
These schemas control what the API exposes and accepts.
"""

from __future__ import annotations

from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.database.profile import AvailabilityStatus, BloodGroup, Gender, UserRole


# ── Response schema ───────────────────────────────────────────────────────


class ProfileResponse(BaseModel):
    """Public-safe profile fields returned to the authenticated owner.

    Protected fields (role, organization_id, etc.) are intentionally included
    here because users need to see their own role. They are never writable
    through the public update endpoint.
    """

    id: UUID
    full_name: str | None = None
    email: str | None = None
    phone: str | None = None
    avatar_url: str | None = None
    date_of_birth: date | None = None
    gender: Gender | None = None
    address: str | None = None
    blood_group: BloodGroup | None = None
    allergies: str | None = None
    medical_conditions: str | None = None
    current_medications: str | None = None
    medical_notes: str | None = None
    hospital_name: str | None = None
    # Read-only — users cannot update these via PUT/PATCH
    role: UserRole = UserRole.user
    availability_status: AvailabilityStatus = AvailabilityStatus.offline
    is_verified: bool = False
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ── Write schemas ─────────────────────────────────────────────────────────


class ProfileUpdateRequest(BaseModel):
    """Fields a user may submit to replace their profile (PUT).

    extra="forbid" rejects any unrecognised keys — prevents role stuffing.
    Protected fields are absent by design.
    """

    full_name: str | None = Field(default=None, max_length=100)
    phone: str | None = Field(default=None, max_length=20)
    avatar_url: str | None = None
    date_of_birth: date | None = None
    gender: Gender | None = None
    address: str | None = Field(default=None, max_length=300)
    blood_group: BloodGroup | None = None
    allergies: str | None = Field(default=None, max_length=500)
    medical_conditions: str | None = Field(default=None, max_length=500)
    current_medications: str | None = Field(default=None, max_length=500)
    medical_notes: str | None = Field(default=None, max_length=1000)
    hospital_name: str | None = Field(default=None, max_length=200)

    model_config = ConfigDict(extra="forbid")


class ProfilePatchRequest(BaseModel):
    """Fields a user may partially update (PATCH).

    Identical allowed fields to ProfileUpdateRequest.
    All fields are optional — only provided ones are applied.
    """

    full_name: str | None = Field(default=None, max_length=100)
    phone: str | None = Field(default=None, max_length=20)
    avatar_url: str | None = None
    date_of_birth: date | None = None
    gender: Gender | None = None
    address: str | None = Field(default=None, max_length=300)
    blood_group: BloodGroup | None = None
    allergies: str | None = Field(default=None, max_length=500)
    medical_conditions: str | None = Field(default=None, max_length=500)
    current_medications: str | None = Field(default=None, max_length=500)
    medical_notes: str | None = Field(default=None, max_length=1000)
    hospital_name: str | None = Field(default=None, max_length=200)

    model_config = ConfigDict(extra="forbid")
