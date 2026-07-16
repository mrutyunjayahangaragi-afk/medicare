"""
app/repositories/hospital.py
Repository for hospital portal operations.

Responsibilities:
  - Fetch hospital profile for a user
  - Create/update hospital profile
  - Manage hospital staff, beds, ambulances
  - Manage hospital assignments
  - Fetch dashboard statistics
  - All operations go through secure Supabase RPC functions where applicable

Security notes:
  - Hospital access is validated before any mutation
  - RLS policies ensure hospitals can only access their own data
  - Admins can access all hospital data
"""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Any

from supabase import Client

from app.repositories.base import BaseRepository
from app.schemas.hospital import (
    HospitalAmbulanceCreate,
    HospitalAmbulanceResponse,
    HospitalAssignmentResponse,
    HospitalBedCreate,
    HospitalBedResponse,
    HospitalProfileCreate,
    HospitalProfileResponse,
    HospitalStaffCreate,
    HospitalStaffResponse,
)

logger = logging.getLogger("medicare.repositories.hospital")


class HospitalRepository(BaseRepository):
    """Data access for hospital portal tables."""

    # ── Hospital Profile ───────────────────────────────────────────────────────

    def get_profile_by_user_id(self, user_id: str) -> HospitalProfileResponse | None:
        """Fetch hospital profile by user ID."""
        response = (
            self._admin()
            .table("hospital_profiles")
            .select("*")
            .eq("user_id", user_id)
            .maybe_single()
            .execute()
        )
        if response.data is None:
            return None
        return HospitalProfileResponse.model_validate(response.data)

    def create_profile(
        self, user_id: str, payload: HospitalProfileCreate
    ) -> HospitalProfileResponse:
        """Create a new hospital profile."""
        data = payload.model_dump(exclude_none=True)
        data["user_id"] = user_id

        response = self._admin().table("hospital_profiles").insert(data).execute()
        return HospitalProfileResponse.model_validate(response.data[0])

    def update_profile(
        self, profile_id: str, payload: dict[str, Any]
    ) -> HospitalProfileResponse:
        """Update hospital profile."""
        response = (
            self._admin()
            .table("hospital_profiles")
            .update(payload)
            .eq("id", profile_id)
            .execute()
        )
        return HospitalProfileResponse.model_validate(response.data[0])

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
        query = (
            self._admin()
            .table("hospital_staff")
            .select("*")
            .eq("hospital_id", hospital_id)
            .eq("is_active", True)
            .order("created_at", desc=True)
            .range(offset, offset + limit - 1)
        )

        if staff_type:
            query = query.eq("staff_type", staff_type)
        if department:
            query = query.eq("department", department)
        if is_available is not None:
            query = query.eq("is_available", is_available)

        response = query.execute()
        return [HospitalStaffResponse.model_validate(r) for r in (response.data or [])]

    def count_staff(
        self,
        hospital_id: str,
        staff_type: str | None = None,
        department: str | None = None,
        is_available: bool | None = None,
    ) -> int:
        """Count hospital staff with optional filters."""
        query = (
            self._admin()
            .table("hospital_staff")
            .select("id", count="exact")
            .eq("hospital_id", hospital_id)
            .eq("is_active", True)
        )

        if staff_type:
            query = query.eq("staff_type", staff_type)
        if department:
            query = query.eq("department", department)
        if is_available is not None:
            query = query.eq("is_available", is_available)

        response = query.execute()
        return response.count or 0

    def get_staff(self, staff_id: str) -> HospitalStaffResponse | None:
        """Fetch a single staff member by ID."""
        response = (
            self._admin()
            .table("hospital_staff")
            .select("*")
            .eq("id", staff_id)
            .maybe_single()
            .execute()
        )
        if response.data is None:
            return None
        return HospitalStaffResponse.model_validate(response.data)

    def create_staff(
        self, hospital_id: str, payload: HospitalStaffCreate
    ) -> HospitalStaffResponse:
        """Create a new staff member."""
        data = payload.model_dump(exclude_none=True)
        data["hospital_id"] = hospital_id

        response = self._admin().table("hospital_staff").insert(data).execute()
        return HospitalStaffResponse.model_validate(response.data[0])

    def update_staff(self, staff_id: str, payload: dict[str, Any]) -> HospitalStaffResponse:
        """Update staff member."""
        response = (
            self._admin()
            .table("hospital_staff")
            .update(payload)
            .eq("id", staff_id)
            .execute()
        )
        return HospitalStaffResponse.model_validate(response.data[0])

    def delete_staff(self, staff_id: str) -> bool:
        """Delete staff member (soft delete by setting is_active=False)."""
        response = (
            self._admin()
            .table("hospital_staff")
            .update({"is_active": False})
            .eq("id", staff_id)
            .execute()
        )
        return len(response.data) > 0

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
        query = (
            self._admin()
            .table("hospital_beds")
            .select("*")
            .eq("hospital_id", hospital_id)
            .eq("is_active", True)
            .order("bed_number")
            .range(offset, offset + limit - 1)
        )

        if bed_type:
            query = query.eq("bed_type", bed_type)
        if is_available is not None:
            query = query.eq("is_available", is_available)
        if ward:
            query = query.eq("ward", ward)

        response = query.execute()
        return [HospitalBedResponse.model_validate(r) for r in (response.data or [])]

    def count_beds(
        self,
        hospital_id: str,
        bed_type: str | None = None,
        is_available: bool | None = None,
    ) -> int:
        """Count hospital beds with optional filters."""
        query = (
            self._admin()
            .table("hospital_beds")
            .select("id", count="exact")
            .eq("hospital_id", hospital_id)
            .eq("is_active", True)
        )

        if bed_type:
            query = query.eq("bed_type", bed_type)
        if is_available is not None:
            query = query.eq("is_available", is_available)

        response = query.execute()
        return response.count or 0

    def get_bed(self, bed_id: str) -> HospitalBedResponse | None:
        """Fetch a single bed by ID."""
        response = (
            self._admin()
            .table("hospital_beds")
            .select("*")
            .eq("id", bed_id)
            .maybe_single()
            .execute()
        )
        if response.data is None:
            return None
        return HospitalBedResponse.model_validate(response.data)

    def create_bed(self, hospital_id: str, payload: HospitalBedCreate) -> HospitalBedResponse:
        """Create a new bed."""
        data = payload.model_dump(exclude_none=True)
        data["hospital_id"] = hospital_id

        response = self._admin().table("hospital_beds").insert(data).execute()
        return HospitalBedResponse.model_validate(response.data[0])

    def update_bed(self, bed_id: str, payload: dict[str, Any]) -> HospitalBedResponse:
        """Update bed."""
        response = (
            self._admin()
            .table("hospital_beds")
            .update(payload)
            .eq("id", bed_id)
            .execute()
        )
        return HospitalBedResponse.model_validate(response.data[0])

    def delete_bed(self, bed_id: str) -> bool:
        """Delete bed (soft delete by setting is_active=False)."""
        response = (
            self._admin()
            .table("hospital_beds")
            .update({"is_active": False})
            .eq("id", bed_id)
            .execute()
        )
        return len(response.data) > 0

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
        query = (
            self._admin()
            .table("hospital_ambulances")
            .select("*")
            .eq("hospital_id", hospital_id)
            .eq("is_active", True)
            .order("vehicle_number")
            .range(offset, offset + limit - 1)
        )

        if status:
            query = query.eq("status", status)
        if vehicle_type:
            query = query.eq("vehicle_type", vehicle_type)

        response = query.execute()
        return [HospitalAmbulanceResponse.model_validate(r) for r in (response.data or [])]

    def count_ambulances(
        self,
        hospital_id: str,
        status: str | None = None,
    ) -> int:
        """Count hospital ambulances with optional filters."""
        query = (
            self._admin()
            .table("hospital_ambulances")
            .select("id", count="exact")
            .eq("hospital_id", hospital_id)
            .eq("is_active", True)
        )

        if status:
            query = query.eq("status", status)

        response = query.execute()
        return response.count or 0

    def get_ambulance(self, ambulance_id: str) -> HospitalAmbulanceResponse | None:
        """Fetch a single ambulance by ID."""
        response = (
            self._admin()
            .table("hospital_ambulances")
            .select("*")
            .eq("id", ambulance_id)
            .maybe_single()
            .execute()
        )
        if response.data is None:
            return None
        return HospitalAmbulanceResponse.model_validate(response.data)

    def create_ambulance(
        self, hospital_id: str, payload: HospitalAmbulanceCreate
    ) -> HospitalAmbulanceResponse:
        """Create a new ambulance."""
        data = payload.model_dump(exclude_none=True)
        data["hospital_id"] = hospital_id

        response = self._admin().table("hospital_ambulances").insert(data).execute()
        return HospitalAmbulanceResponse.model_validate(response.data[0])

    def update_ambulance(
        self, ambulance_id: str, payload: dict[str, Any]
    ) -> HospitalAmbulanceResponse:
        """Update ambulance."""
        response = (
            self._admin()
            .table("hospital_ambulances")
            .update(payload)
            .eq("id", ambulance_id)
            .execute()
        )
        return HospitalAmbulanceResponse.model_validate(response.data[0])

    def delete_ambulance(self, ambulance_id: str) -> bool:
        """Delete ambulance (soft delete by setting is_active=False)."""
        response = (
            self._admin()
            .table("hospital_ambulances")
            .update({"is_active": False})
            .eq("id", ambulance_id)
            .execute()
        )
        return len(response.data) > 0

    # ── Hospital Assignments ─────────────────────────────────────────────────

    def list_assignments(
        self,
        hospital_id: str,
        status: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[HospitalAssignmentResponse]:
        """List hospital assignments with optional filters."""
        query = (
            self._admin()
            .table("hospital_assignments")
            .select("*")
            .eq("hospital_id", hospital_id)
            .order("assigned_at", desc=True)
            .range(offset, offset + limit - 1)
        )

        if status:
            query = query.eq("status", status)

        response = query.execute()
        return [HospitalAssignmentResponse.model_validate(r) for r in (response.data or [])]

    def count_assignments(
        self,
        hospital_id: str,
        status: str | None = None,
    ) -> int:
        """Count hospital assignments with optional filters."""
        query = (
            self._admin()
            .table("hospital_assignments")
            .select("id", count="exact")
            .eq("hospital_id", hospital_id)
        )

        if status:
            query = query.eq("status", status)

        response = query.execute()
        return response.count or 0

    def get_assignment(self, assignment_id: str) -> HospitalAssignmentResponse | None:
        """Fetch a single assignment by ID."""
        response = (
            self._admin()
            .table("hospital_assignments")
            .select("*")
            .eq("id", assignment_id)
            .maybe_single()
            .execute()
        )
        if response.data is None:
            return None
        return HospitalAssignmentResponse.model_validate(response.data)

    def get_assignment_by_request(
        self, request_id: str
    ) -> HospitalAssignmentResponse | None:
        """Fetch assignment by emergency request ID."""
        response = (
            self._admin()
            .table("hospital_assignments")
            .select("*")
            .eq("emergency_request_id", request_id)
            .maybe_single()
            .execute()
        )
        if response.data is None:
            return None
        return HospitalAssignmentResponse.model_validate(response.data)

    def update_assignment(
        self, assignment_id: str, payload: dict[str, Any]
    ) -> HospitalAssignmentResponse:
        """Update assignment."""
        response = (
            self._admin()
            .table("hospital_assignments")
            .update(payload)
            .eq("id", assignment_id)
            .execute()
        )
        return HospitalAssignmentResponse.model_validate(response.data[0])

    # ── RPC Functions ─────────────────────────────────────────────────────────

    def accept_request_via_rpc(
        self, request_id: str, user_client: Client
    ) -> dict[str, Any]:
        """Accept emergency request via RPC."""
        result = user_client.rpc(
            "hospital_accept_request",
            {"request_id": request_id},
        ).execute()
        return result.data or {}

    def reject_request_via_rpc(
        self, request_id: str, reason: str | None, user_client: Client
    ) -> dict[str, Any]:
        """Reject emergency request via RPC."""
        params = {"request_id": request_id}
        if reason:
            params["reason"] = reason

        result = user_client.rpc(
            "hospital_reject_request",
            params,
        ).execute()
        return result.data or {}

    def assign_doctor_via_rpc(
        self, request_id: str, doctor_id: str, user_client: Client
    ) -> dict[str, Any]:
        """Assign doctor to request via RPC."""
        result = user_client.rpc(
            "hospital_assign_doctor",
            {"request_id": request_id, "doctor_id": doctor_id},
        ).execute()
        return result.data or {}

    def assign_ambulance_via_rpc(
        self, request_id: str, ambulance_id: str, user_client: Client
    ) -> dict[str, Any]:
        """Assign ambulance to request via RPC."""
        result = user_client.rpc(
            "hospital_assign_ambulance",
            {"request_id": request_id, "ambulance_id": ambulance_id},
        ).execute()
        return result.data or {}

    def update_bed_availability_via_rpc(
        self, bed_id: str, is_available: bool, is_occupied: bool, user_client: Client
    ) -> dict[str, Any]:
        """Update bed availability via RPC."""
        result = user_client.rpc(
            "update_bed_availability",
            {
                "bed_id": bed_id,
                "is_available": is_available,
                "is_occupied": is_occupied,
            },
        ).execute()
        return result.data or {}

    def update_ambulance_status_via_rpc(
        self,
        ambulance_id: str,
        status: str,
        current_latitude: float | None,
        current_longitude: float | None,
        user_client: Client,
    ) -> dict[str, Any]:
        """Update ambulance status via RPC."""
        params = {
            "ambulance_id": ambulance_id,
            "status": status,
        }
        if current_latitude is not None:
            params["current_latitude"] = current_latitude
        if current_longitude is not None:
            params["current_longitude"] = current_longitude

        result = user_client.rpc("update_ambulance_status", params).execute()
        return result.data or {}

    # ── Dashboard Statistics ──────────────────────────────────────────────────

    def get_dashboard_stats(self, hospital_id: str) -> dict[str, Any]:
        """Get dashboard statistics for a hospital."""
        # Get today's date range
        today = datetime.now().date()
        today_start = datetime.combine(today, datetime.min.time())
        today_end = datetime.combine(today, datetime.max.time())

        # Get hospital profile
        profile = self.get_profile_by_user_id(hospital_id)
        if not profile:
            return {}

        # Count requests for today
        today_requests_response = (
            self._admin()
            .table("hospital_assignments")
            .select("id", count="exact")
            .eq("hospital_id", hospital_id)
            .gte("assigned_at", today_start.isoformat())
            .lte("assigned_at", today_end.isoformat())
            .execute()
        )
        today_requests = today_requests_response.count or 0

        # Count by status
        pending_response = (
            self._admin()
            .table("hospital_assignments")
            .select("id", count="exact")
            .eq("hospital_id", hospital_id)
            .eq("status", "assigned")
            .execute()
        )
        pending_requests = pending_response.count or 0

        accepted_response = (
            self._admin()
            .table("hospital_assignments")
            .select("id", count="exact")
            .eq("hospital_id", hospital_id)
            .in_("status", ["assigned", "in_transit"])
            .execute()
        )
        accepted_requests = accepted_response.count or 0

        in_progress_response = (
            self._admin()
            .table("hospital_assignments")
            .select("id", count="exact")
            .eq("hospital_id", hospital_id)
            .in_("status", ["arrived", "treating"])
            .execute()
        )
        in_progress_requests = in_progress_response.count or 0

        completed_response = (
            self._admin()
            .table("hospital_assignments")
            .select("id", count="exact")
            .eq("hospital_id", hospital_id)
            .eq("status", "completed")
            .execute()
        )
        completed_requests = completed_response.count or 0

        # Count beds
        available_beds = self.count_beds(hospital_id, is_available=True)
        occupied_beds = self.count_beds(hospital_id, is_occupied=True)

        # Count ambulances
        available_ambulances = self.count_ambulances(hospital_id, status="available")
        busy_ambulances = self.count_ambulances(hospital_id, status="busy")

        # Count staff
        available_doctors = self.count_staff(hospital_id, staff_type="doctor", is_available=True)
        available_nurses = self.count_staff(hospital_id, staff_type="nurse", is_available=True)

        # Count critical cases (from emergency_requests)
        critical_response = (
            self._admin()
            .table("hospital_assignments")
            .select("id", count="exact")
            .eq("hospital_id", hospital_id)
            .in_("status", ["assigned", "in_transit", "arrived", "treating"])
            .execute()
        )
        # Note: This would need to join with emergency_requests to check severity
        # For now, we'll return the count of active cases
        critical_cases = critical_response.count or 0

        return {
            "today_requests": today_requests,
            "pending_requests": pending_requests,
            "accepted_requests": accepted_requests,
            "in_progress_requests": in_progress_requests,
            "completed_requests": completed_requests,
            "available_beds": available_beds,
            "occupied_beds": occupied_beds,
            "available_ambulances": available_ambulances,
            "busy_ambulances": busy_ambulances,
            "available_doctors": available_doctors,
            "available_nurses": available_nurses,
            "critical_cases": critical_cases,
        }
