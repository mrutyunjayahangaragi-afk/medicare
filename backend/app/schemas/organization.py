"""
app/schemas/organization.py
API-level Pydantic schemas for organizations.

Only safe public fields are exposed.
Internal verification notes, audit fields, and private metadata are excluded.
"""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr


# ── Response schemas ──────────────────────────────────────────────────────


class OrganizationPublicResponse(BaseModel):
    """Safe public organization fields for verified organizations."""

    id: UUID
    name: str
    organization_type: str | None = None
    phone: str | None = None
    email: EmailStr | None = None
    address: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    is_verified: bool = True
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class OrganizationMemberResponse(BaseModel):
    """Safe representation of a member in an organization."""

    id: UUID
    organization_id: UUID
    user_id: UUID
    member_role: str
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ── Input schemas ─────────────────────────────────────────────────────────


class AddMemberRequest(BaseModel):
    """Payload for adding a member to an organization."""

    user_id: UUID

    model_config = ConfigDict(extra="forbid")


class UpdateMemberRequest(BaseModel):
    """Payload for updating a member's role or status."""

    member_role: str | None = None
    status: str | None = None

    model_config = ConfigDict(extra="forbid")
