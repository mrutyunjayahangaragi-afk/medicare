"""
app/services/hospital_service.py
Business logic for hospital portal operations.

The service layer enforces business rules on top of the repository.
All critical operations go through secure RPC functions.
"""

from __future__ import annotations

import logging
from typing import Any

from fastapi import HTTPException, status
from supabase import Client

from app.repositories.hospital import HospitalRepository
from app.schemas.hospital import (
    HospitalAmbulanceCreate,
    HospitalAssignmentResponse,
    HospitalBedCreate,
    HospitalDashboardStats,
    HospitalProfileCreate,
    HospitalProfileResponse,
    HospitalProfileUpdate,
    HospitalStaffCreate,
    HospitalStaffResponse,
)

logger = logging.getLogger("medicare.services.hospital")


class HospitalService:
    """Orchestrates hospital portal operations."""

    def __init__(self, repo: HospitalRepository | None = None) -> None:
        self._repo = repo or HospitalRepository()

    # ── Hospital Profile ───────────────────────────────────────────────────────

    def get_profile(self, user_id: str) -> HospitalProfileResponse:
        """Get hospital profile for the authenticated user."""
        profile = self._repo.get_profile_by_user_id(user_id)
        if profile is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Hospital profile not found. Please create a profile first.",
            )
        return profile

    def create_profile(
        self, user_id: str, payload: HospitalProfileCreate
    ) -> HospitalProfileResponse:
        """Create a new hospital profile for the authenticated user."""
        # Check if profile already exists
        existing = self._repo.get_profile_by_user_id(user_id)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Hospital profile already exists for this user.",
            )

        profile = self._repo.create_profile(user_id, payload)
        logger.info("Hospital profile %s created for user %s", profile.id, user_id)
        return profile

    def update_profile(
        self, user_id: str, payload: HospitalProfileUpdate
    ) -> HospitalProfileResponse:
        """Update hospital profile for the authenticated user."""
        profile = self._repo.get_profile_by_user_id(user_id)
        if profile is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Hospital profile not found.",
            )

        # Convert payload to dict and remove None values
        update_data = payload.model_dump(exclude_none=True)
        if not update_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No fields to update.",
            )

        updated_profile = self._repo.update_profile(str(profile.id), update_data)
        logger.info("Hospital profile %s updated by user %s", profile.id, user_id)
        return updated_profile

    # ── Hospital Staff ────────────────────────────────────────────────────────

    def list_staff(
        self,
        hospital_id: str,
        staff_type: str | None = None,
        department: str | None = None,
        is_available: bool | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[HospitalStaffResponse]:
        """List hospital staff with optional filters."""
        return self._repo.list_staff(
            hospital_id, staff_type, department, is_available, limit, offset
        )

    def get_staff(self, staff_id: str) -> HospitalStaffResponse:
        """Get a single staff member by ID."""
        staff = self._repo.get_staff(staff_id)
        if staff is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Staff member not found.",
            )
        return staff

    def create_staff(
        self, hospital_id: str, payload: HospitalStaffCreate
    ) -> HospitalStaffResponse:
        """Create a new staff member."""
        staff = self._repo.create_staff(hospital_id, payload)
        logger.info("Staff %s created for hospital %s", staff.id, hospital_id)
        return staff

    def update_staff(
        self, staff_id: str, payload: dict[str, Any]
    ) -> HospitalStaffResponse:
        """Update staff member."""
        if not payload:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No fields to update.",
            )

        staff = self._repo.update_staff(staff_id, payload)
        logger.info("Staff %s updated", staff_id)
        return staff

    def delete_staff(self, staff_id: str) -> dict[str, str]:
        """Delete staff member (soft delete)."""
        success = self._repo.delete_staff(staff_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Staff member not found.",
            )
        logger.info("Staff %s deleted", staff_id)
        return {"message": "Staff member deleted successfully"}

    # ── Hospital Beds ─────────────────────────────────────────────────────────

    def list_beds(
        self,
        hospital_id: str,
        bed_type: str | None = None,
        is_available: bool | None = None,
        ward: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[HospitalBedResponse]:
        """List hospital beds with optional filters."""
        return self._repo.list_beds(hospital_id, bed_type, is_available, ward, limit, offset)

    def get_bed(self, bed_id: str) -> HospitalBedResponse:
        """Get a single bed by ID."""
        bed = self._repo.get_bed(bed_id)
        if bed is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Bed not found.",
            )
        return bed

    def create_bed(self, hospital_id: str, payload: HospitalBedCreate) -> HospitalBedResponse:
        """Create a new bed."""
        bed = self._repo.create_bed(hospital_id, payload)
        logger.info("Bed %s created for hospital %s", bed.id, hospital_id)
        return bed

    def update_bed(self, bed_id: str, payload: dict[str, Any]) -> HospitalBedResponse:
        """Update bed."""
        if not payload:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No fields to update.",
            )

        bed = self._repo.update_bed(bed_id, payload)
        logger.info("Bed %s updated", bed_id)
        return bed

    def delete_bed(self, bed_id: str) -> dict[str, str]:
        """Delete bed (soft delete)."""
        success = self._repo.delete_bed(bed_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Bed not found.",
            )
        logger.info("Bed %s deleted", bed_id)
        return {"message": "Bed deleted successfully"}

    def update_bed_availability(
        self,
        bed_id: str,
        is_available: bool,
        is_occupied: bool,
        user_client: Client,
    ) -> dict[str, Any]:
        """Update bed availability via RPC."""
        result = self._repo.update_bed_availability_via_rpc(
            bed_id, is_available, is_occupied, user_client
        )
        logger.info("Bed %s availability updated: available=%s, occupied=%s", bed_id, is_available, is_occupied)
        return result

    # ── Hospital Ambulances ──────────────────────────────────────────────────

    def list_ambulances(
        self,
        hospital_id: str,
        status: str | None = None,
        vehicle_type: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[HospitalAmbulanceResponse]:
        """List hospital ambulances with optional filters."""
        return self._repo.list_ambulances(hospital_id, status, vehicle_type, limit, offset)

    def get_ambulance(self, ambulance_id: str) -> HospitalAmbulanceResponse:
        """Get a single ambulance by ID."""
        ambulance = self._repo.get_ambulance(ambulance_id)
        if ambulance is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Ambulance not found.",
            )
        return ambulance

    def create_ambulance(
        self, hospital_id: str, payload: HospitalAmbulanceCreate
    ) -> HospitalAmbulanceResponse:
        """Create a new ambulance."""
        ambulance = self._repo.create_ambulance(hospital_id, payload)
        logger.info("Ambulance %s created for hospital %s", ambulance.id, hospital_id)
        return ambulance

    def update_ambulance(
        self, ambulance_id: str, payload: dict[str, Any]
    ) -> HospitalAmbulanceResponse:
        """Update ambulance."""
        if not payload:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No fields to update.",
            )

        ambulance = self._repo.update_ambulance(ambulance_id, payload)
        logger.info("Ambulance %s updated", ambulance_id)
        return ambulance

    def delete_ambulance(self, ambulance_id: str) -> dict[str, str]:
        """Delete ambulance (soft delete)."""
        success = self._repo.delete_ambulance(ambulance_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Ambulance not found.",
            )
        logger.info("Ambulance %s deleted", ambulance_id)
        return {"message": "Ambulance deleted successfully"}

    def update_ambulance_status(
        self,
        ambulance_id: str,
        status: str,
        current_latitude: float | None,
        current_longitude: float | None,
        user_client: Client,
    ) -> dict[str, Any]:
        """Update ambulance status via RPC."""
        # Validate status
        valid_statuses = ["available", "busy", "maintenance", "out_of_service"]
        if status not in valid_statuses:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}",
            )

        result = self._repo.update_ambulance_status_via_rpc(
            ambulance_id, status, current_latitude, current_longitude, user_client
        )
        logger.info("Ambulance %s status updated to %s", ambulance_id, status)
        return result

    # ── Hospital Assignments ─────────────────────────────────────────────────

    def list_assignments(
        self,
        hospital_id: str,
        status: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[HospitalAssignmentResponse]:
        """List hospital assignments with optional filters."""
        return self._repo.list_assignments(hospital_id, status, limit, offset)

    def get_assignment(self, assignment_id: str) -> HospitalAssignmentResponse:
        """Get a single assignment by ID."""
        assignment = self._repo.get_assignment(assignment_id)
        if assignment is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Assignment not found.",
            )
        return assignment

    def update_assignment(
        self, assignment_id: str, payload: dict[str, Any]
    ) -> HospitalAssignmentResponse:
        """Update assignment."""
        if not payload:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No fields to update.",
            )

        assignment = self._repo.update_assignment(assignment_id, payload)
        logger.info("Assignment %s updated", assignment_id)
        return assignment

    def accept_request(
        self,
        request_id: str,
        user_id: str,
        user_client: Client,
    ) -> dict[str, Any]:
        """Accept an emergency request as a hospital via RPC."""
        result = self._repo.accept_request_via_rpc(request_id, user_client)
        logger.info("Emergency request %s accepted by hospital user %s", request_id, user_id)
        return result

    def reject_request(
        self,
        request_id: str,
        reason: str | None,
        user_id: str,
        user_client: Client,
    ) -> dict[str, Any]:
        """Reject an emergency request via RPC."""
        result = self._repo.reject_request_via_rpc(request_id, reason, user_client)
        logger.info("Emergency request %s rejected by hospital user %s", request_id, user_id)
        return result

    def assign_doctor(
        self,
        request_id: str,
        doctor_id: str,
        user_client: Client,
    ) -> dict[str, Any]:
        """Assign a doctor to an emergency request via RPC."""
        result = self._repo.assign_doctor_via_rpc(request_id, doctor_id, user_client)
        logger.info("Doctor %s assigned to request %s", doctor_id, request_id)
        return result

    def assign_ambulance(
        self,
        request_id: str,
        ambulance_id: str,
        user_client: Client,
    ) -> dict[str, Any]:
        """Assign an ambulance to an emergency request via RPC."""
        result = self._repo.assign_ambulance_via_rpc(request_id, ambulance_id, user_client)
        logger.info("Ambulance %s assigned to request %s", ambulance_id, request_id)
        return result

    # ── Dashboard Statistics ──────────────────────────────────────────────────

    def get_dashboard_stats(self, hospital_id: str) -> HospitalDashboardStats:
        """Get dashboard statistics for a hospital."""
        stats = self._repo.get_dashboard_stats(hospital_id)
        return HospitalDashboardStats(**stats)
