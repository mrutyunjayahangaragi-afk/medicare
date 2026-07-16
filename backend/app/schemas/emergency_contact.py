"""
app/schemas/emergency_contact.py
API-level Pydantic schemas for emergency contacts.
"""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field


# ── Response schema ───────────────────────────────────────────────────────


class EmergencyContactResponse(BaseModel):
    """Safe emergency contact fields returned to the authenticated owner."""

    id: UUID
    user_id: UUID
    full_name: str
    relationship: str | None = None
    phone_number: str
    alternate_phone: str | None = None
    email: EmailStr | None = None
    is_primary: bool = False
    notify_during_emergency: bool = True
    notes: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ── Create / update schemas ───────────────────────────────────────────────


class EmergencyContactCreate(BaseModel):
    """Payload for creating a new emergency contact.

    user_id is always set from the token — never from the request body.
    """

    full_name: str = Field(min_length=1, max_length=100)
    relationship: str | None = Field(default=None, max_length=50)
    phone_number: str = Field(min_length=7, max_length=20)
    alternate_phone: str | None = Field(default=None, max_length=20)
    email: EmailStr | None = None
    is_primary: bool = False
    notify_during_emergency: bool = True
    notes: str | None = Field(default=None, max_length=500)

    model_config = ConfigDict(extra="forbid")


class EmergencyContactUpdate(BaseModel):
    """Full update payload (PUT)."""

    full_name: str = Field(min_length=1, max_length=100)
    relationship: str | None = Field(default=None, max_length=50)
    phone_number: str = Field(min_length=7, max_length=20)
    alternate_phone: str | None = Field(default=None, max_length=20)
    email: EmailStr | None = None
    is_primary: bool = False
    notify_during_emergency: bool = True
    notes: str | None = Field(default=None, max_length=500)

    model_config = ConfigDict(extra="forbid")


class EmergencyContactPatch(BaseModel):
    """Partial update payload (PATCH)."""

    full_name: str | None = Field(default=None, min_length=1, max_length=100)
    relationship: str | None = Field(default=None, max_length=50)
    phone_number: str | None = Field(default=None, min_length=7, max_length=20)
    alternate_phone: str | None = Field(default=None, max_length=20)
    email: EmailStr | None = None
    is_primary: bool | None = None
    notify_during_emergency: bool | None = None
    notes: str | None = Field(default=None, max_length=500)

    model_config = ConfigDict(extra="forbid")
