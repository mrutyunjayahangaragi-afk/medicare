"""
app/schemas/database/profile.py
Pydantic schemas mirroring the public.profiles table.
"""

from __future__ import annotations

from datetime import date, datetime
from enum import Enum
from uuid import UUID

from pydantic import BaseModel, Field


# ── Enums ─────────────────────────────────────────────────────────────────

class UserRole(str, Enum):
    """Allowed role values in public.profiles."""
    user           = "user"
    responder      = "responder"
    volunteer      = "volunteer"
    hospital_staff = "hospital_staff"
    hospital       = "hospital"
    admin          = "admin"


class AvailabilityStatus(str, Enum):
    """Responder availability states."""
    available = "available"
    busy      = "busy"
    offline   = "offline"


class Gender(str, Enum):
    male             = "male"
    female           = "female"
    other            = "other"
    prefer_not_to_say = "prefer_not_to_say"


class BloodGroup(str, Enum):
    A_pos  = "A+"
    A_neg  = "A-"
    B_pos  = "B+"
    B_neg  = "B-"
    AB_pos = "AB+"
    AB_neg = "AB-"
    O_pos  = "O+"
    O_neg  = "O-"
    unknown = "Unknown"


# ── Row schema ────────────────────────────────────────────────────────────

class ProfileRow(BaseModel):
    """Full database row for public.profiles.

    Protected fields (role, organization_id, responder_type, is_verified)
    are included because the repository layer reads them, but they are
    excluded from user-facing API responses.
    """

    id:                   UUID
    full_name:            str   | None = None
    email:                str   | None = None
    phone:                str   | None = None
    avatar_url:           str   | None = None
    date_of_birth:        date  | None = None
    gender:               Gender | None = None
    address:              str   | None = None
    blood_group:          BloodGroup | None = None
    allergies:            str   | None = None
    medical_conditions:   str   | None = None
    current_medications:  str   | None = None
    medical_notes:        str   | None = None

    # Protected fields — managed by admin workflows only
    role:                 UserRole = UserRole.user
    responder_type:       str   | None = None
    availability_status:  AvailabilityStatus = AvailabilityStatus.offline
    organization_id:      UUID  | None = None
    is_verified:          bool  = False
    hospital_name:        str   | None = None

    created_at:           datetime
    updated_at:           datetime

    model_config = {"from_attributes": True}


# ── Update payload ────────────────────────────────────────────────────────

class ProfileUpdate(BaseModel):
    """Fields a user may update on their own profile.

    Protected fields are intentionally absent — the repository layer
    excludes them even if somehow passed in.
    """

    full_name:           str   | None = Field(default=None, max_length=100)
    phone:               str   | None = Field(default=None, max_length=20)
    avatar_url:          str   | None = None
    date_of_birth:       date  | None = None
    gender:              Gender | None = None
    address:             str   | None = Field(default=None, max_length=300)
    blood_group:         BloodGroup | None = None
    allergies:           str   | None = Field(default=None, max_length=500)
    medical_conditions:  str   | None = Field(default=None, max_length=500)
    current_medications: str   | None = Field(default=None, max_length=500)
    medical_notes:       str   | None = Field(default=None, max_length=1000)
    hospital_name:       str   | None = Field(default=None, max_length=200)
