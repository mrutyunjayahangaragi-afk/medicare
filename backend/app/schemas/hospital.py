"""
app/schemas/hospital.py
API-level Pydantic schemas for hospital portal.

These schemas control what the API exposes and accepts for hospital operations.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


# ── Hospital Profile Schemas ────────────────────────────────────────────────


class HospitalProfileCreate(BaseModel):
    """Payload for creating a hospital profile."""

    hospital_name: str = Field(min_length=2, max_length=200)
    license_number: str = Field(min_length=5, max_length=50)
    registration_number: str = Field(min_length=5, max_length=50)
    phone_number: str = Field(min_length=7, max_length=20)
    alternate_phone: str | None = Field(default=None, max_length=20)
    email: str | None = Field(default=None, max_length=255)
    website: str | None = Field(default=None, max_length=500)
    address: str = Field(min_length=5, max_length=500)
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    total_beds: int = Field(default=0, ge=0)
    total_icu_beds: int = Field(default=0, ge=0)
    total_emergency_beds: int = Field(default=0, ge=0)
    is_24_7: bool = Field(default=True)
    opening_time: str | None = None
    closing_time: str | None = None
    services: list[str] | None = Field(default_factory=list)
    specialties: list[str] | None = Field(default_factory=list)
    has_emergency: bool = Field(default=True)
    has_ambulance: bool = Field(default=False)
    has_icu: bool = Field(default=False)
    has_surgery: bool = Field(default=False)

    model_config = ConfigDict(extra="forbid")


class HospitalProfileUpdate(BaseModel):
    """Payload for updating a hospital profile."""

    hospital_name: str | None = Field(default=None, min_length=2, max_length=200)
    phone_number: str | None = Field(default=None, min_length=7, max_length=20)
    alternate_phone: str | None = Field(default=None, max_length=20)
    email: str | None = Field(default=None, max_length=255)
    website: str | None = Field(default=None, max_length=500)
    address: str | None = Field(default=None, min_length=5, max_length=500)
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    total_beds: int | None = Field(default=None, ge=0)
    total_icu_beds: int | None = Field(default=None, ge=0)
    total_emergency_beds: int | None = Field(default=None, ge=0)
    is_24_7: bool | None = None
    opening_time: str | None = None
    closing_time: str | None = None
    services: list[str] | None = None
    specialties: list[str] | None = None
    has_emergency: bool | None = None
    has_ambulance: bool | None = None
    has_icu: bool | None = None
    has_surgery: bool | None = None
    is_active: bool | None = None

    model_config = ConfigDict(extra="forbid")


class HospitalProfileResponse(BaseModel):
    """Hospital profile response."""

    id: UUID
    user_id: UUID
    hospital_name: str
    license_number: str
    registration_number: str
    phone_number: str
    alternate_phone: str | None = None
    email: str | None = None
    website: str | None = None
    address: str
    latitude: float | None = None
    longitude: float | None = None
    total_beds: int
    total_icu_beds: int
    total_emergency_beds: int
    is_24_7: bool
    opening_time: str | None = None
    closing_time: str | None = None
    services: list[str] | None = None
    specialties: list[str] | None = None
    has_emergency: bool
    has_ambulance: bool
    has_icu: bool
    has_surgery: bool
    is_verified: bool
    verified_at: datetime | None = None
    verified_by: UUID | None = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ── Hospital Staff Schemas ─────────────────────────────────────────────────────


class HospitalStaffCreate(BaseModel):
    """Payload for creating hospital staff."""

    hospital_id: UUID
    full_name: str = Field(min_length=2, max_length=100)
    staff_type: str = Field(default="doctor")  # doctor, nurse, paramedic, admin, other
    specialization: str | None = Field(default=None, max_length=100)
    department: str | None = Field(default=None, max_length=100)
    phone_number: str = Field(min_length=7, max_length=20)
    email: str | None = Field(default=None, max_length=255)
    is_available: bool = Field(default=True)
    shift_start: str | None = None
    shift_end: str | None = None
    license_number: str | None = Field(default=None, max_length=50)
    qualifications: list[str] | None = Field(default_factory=list)

    model_config = ConfigDict(extra="forbid")


class HospitalStaffUpdate(BaseModel):
    """Payload for updating hospital staff."""

    full_name: str | None = Field(default=None, min_length=2, max_length=100)
    staff_type: str | None = None
    specialization: str | None = Field(default=None, max_length=100)
    department: str | None = Field(default=None, max_length=100)
    phone_number: str | None = Field(default=None, min_length=7, max_length=20)
    email: str | None = Field(default=None, max_length=255)
    is_available: bool | None = None
    shift_start: str | None = None
    shift_end: str | None = None
    license_number: str | None = Field(default=None, max_length=50)
    qualifications: list[str] | None = None
    is_active: bool | None = None

    model_config = ConfigDict(extra="forbid")


class HospitalStaffResponse(BaseModel):
    """Hospital staff response."""

    id: UUID
    hospital_id: UUID
    full_name: str
    staff_type: str
    specialization: str | None = None
    department: str | None = None
    phone_number: str
    email: str | None = None
    is_available: bool
    shift_start: str | None = None
    shift_end: str | None = None
    license_number: str | None = None
    qualifications: list[str] | None = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ── Hospital Bed Schemas ───────────────────────────────────────────────────────


class HospitalBedCreate(BaseModel):
    """Payload for creating hospital beds."""

    hospital_id: UUID
    bed_number: str = Field(min_length=1, max_length=20)
    bed_type: str = Field(default="general")  # general, icu, emergency, pediatric, surgery
    ward: str | None = Field(default=None, max_length=50)
    floor: str | None = Field(default=None, max_length=20)
    is_available: bool = Field(default=True)
    has_oxygen: bool = Field(default=False)
    has_ventilator: bool = Field(default=False)
    has_monitor: bool = Field(default=False)

    model_config = ConfigDict(extra="forbid")


class HospitalBedUpdate(BaseModel):
    """Payload for updating hospital beds."""

    bed_number: str | None = Field(default=None, min_length=1, max_length=20)
    bed_type: str | None = None
    ward: str | None = Field(default=None, max_length=50)
    floor: str | None = Field(default=None, max_length=20)
    is_available: bool | None = None
    is_occupied: bool | None = None
    has_oxygen: bool | None = None
    has_ventilator: bool | None = None
    has_monitor: bool | None = None
    current_patient_name: str | None = Field(default=None, max_length=100)
    is_active: bool | None = None
    is_under_maintenance: bool | None = None

    model_config = ConfigDict(extra="forbid")


class HospitalBedResponse(BaseModel):
    """Hospital bed response."""

    id: UUID
    hospital_id: UUID
    bed_number: str
    bed_type: str
    ward: str | None = None
    floor: str | None = None
    is_available: bool
    is_occupied: bool
    has_oxygen: bool
    has_ventilator: bool
    has_monitor: bool
    current_patient_name: str | None = None
    current_request_id: UUID | None = None
    admitted_at: datetime | None = None
    is_active: bool
    is_under_maintenance: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class BedAvailabilityUpdate(BaseModel):
    """Payload for updating bed availability."""

    is_available: bool
    is_occupied: bool


# ── Hospital Ambulance Schemas ─────────────────────────────────────────────────


class HospitalAmbulanceCreate(BaseModel):
    """Payload for creating hospital ambulances."""

    hospital_id: UUID
    vehicle_number: str = Field(min_length=5, max_length=20)
    vehicle_type: str = Field(default="basic")  # basic, advanced, neonatal, bariatric
    model: str | None = Field(default=None, max_length=50)
    year: int | None = Field(default=None, ge=1990)
    has_oxygen: bool = Field(default=True)
    has_ventilator: bool = Field(default=False)
    has_defibrillator: bool = Field(default=True)
    has_suction: bool = Field(default=True)
    has_stretcher: bool = Field(default=True)
    has_monitor: bool = Field(default=False)
    driver_name: str | None = Field(default=None, max_length=100)
    driver_phone: str | None = Field(default=None, max_length=20)
    paramedic_name: str | None = Field(default=None, max_length=100)
    paramedic_phone: str | None = Field(default=None, max_length=20)

    model_config = ConfigDict(extra="forbid")


class HospitalAmbulanceUpdate(BaseModel):
    """Payload for updating hospital ambulances."""

    vehicle_number: str | None = Field(default=None, min_length=5, max_length=20)
    vehicle_type: str | None = None
    model: str | None = Field(default=None, max_length=50)
    year: int | None = Field(default=None, ge=1990)
    has_oxygen: bool | None = None
    has_ventilator: bool | None = None
    has_defibrillator: bool | None = None
    has_suction: bool | None = None
    has_stretcher: bool | None = None
    has_monitor: bool | None = None
    driver_name: str | None = Field(default=None, max_length=100)
    driver_phone: str | None = Field(default=None, max_length=20)
    paramedic_name: str | None = Field(default=None, max_length=100)
    paramedic_phone: str | None = Field(default=None, max_length=20)
    status: str | None = None
    is_active: bool | None = None

    model_config = ConfigDict(extra="forbid")


class HospitalAmbulanceResponse(BaseModel):
    """Hospital ambulance response."""

    id: UUID
    hospital_id: UUID
    vehicle_number: str
    vehicle_type: str
    model: str | None = None
    year: int | None = None
    has_oxygen: bool
    has_ventilator: bool
    has_defibrillator: bool
    has_suction: bool
    has_stretcher: bool
    has_monitor: bool
    driver_name: str | None = None
    driver_phone: str | None = None
    paramedic_name: str | None = None
    paramedic_phone: str | None = None
    current_latitude: float | None = None
    current_longitude: float | None = None
    last_location_update: datetime | None = None
    status: str
    current_request_id: UUID | None = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AmbulanceStatusUpdate(BaseModel):
    """Payload for updating ambulance status."""

    status: str  # available, busy, maintenance, out_of_service
    current_latitude: float | None = Field(default=None, ge=-90, le=90)
    current_longitude: float | None = Field(default=None, ge=-180, le=180)


# ── Hospital Assignment Schemas ─────────────────────────────────────────────────


class HospitalAssignmentResponse(BaseModel):
    """Hospital assignment response."""

    id: UUID
    emergency_request_id: UUID
    hospital_id: UUID
    assigned_by: UUID | None = None
    assigned_at: datetime
    assigned_doctor_id: UUID | None = None
    assigned_nurse_id: UUID | None = None
    assigned_paramedic_id: UUID | None = None
    assigned_bed_id: UUID | None = None
    bed_assigned_at: datetime | None = None
    assigned_ambulance_id: UUID | None = None
    ambulance_assigned_at: datetime | None = None
    ambulance_dispatched_at: datetime | None = None
    ambulance_arrived_at: datetime | None = None
    patient_arrived_at: datetime | None = None
    treatment_started_at: datetime | None = None
    treatment_completed_at: datetime | None = None
    patient_discharged_at: datetime | None = None
    diagnosis: str | None = None
    treatment_notes: str | None = None
    follow_up_required: bool
    follow_up_notes: str | None = None
    outcome: str | None = None
    outcome_notes: str | None = None
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AssignmentDoctorUpdate(BaseModel):
    """Payload for assigning doctor to assignment."""

    doctor_id: UUID


class AssignmentAmbulanceUpdate(BaseModel):
    """Payload for assigning ambulance to assignment."""

    ambulance_id: UUID


class AssignmentTreatmentUpdate(BaseModel):
    """Payload for updating treatment details."""

    diagnosis: str | None = Field(default=None, min_length=5, max_length=1000)
    treatment_notes: str | None = Field(default=None, max_length=5000)
    follow_up_required: bool | None = None
    follow_up_notes: str | None = Field(default=None, max_length=1000)
    outcome: str | None = None  # recovered, transferred, admitted, deceased
    outcome_notes: str | None = Field(default=None, max_length=1000)


class AssignmentStatusUpdate(BaseModel):
    """Payload for updating assignment status."""

    status: str  # assigned, in_transit, arrived, treating, completed, transferred


# ── Dashboard Stats Schema ────────────────────────────────────────────────────


class HospitalDashboardStats(BaseModel):
    """Hospital dashboard statistics."""

    today_requests: int
    pending_requests: int
    accepted_requests: int
    in_progress_requests: int
    completed_requests: int
    available_beds: int
    occupied_beds: int
    available_ambulances: int
    busy_ambulances: int
    available_doctors: int
    available_nurses: int
    critical_cases: int


# ── Request Filters ───────────────────────────────────────────────────────────


class HospitalRequestFilters(BaseModel):
    """Query parameter filters for hospital request list."""

    status: str | None = None
    severity: str | None = None
    emergency_type: str | None = None
    search: str | None = Field(default=None, max_length=100)
