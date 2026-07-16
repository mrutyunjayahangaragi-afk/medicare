"""
app/api/v1/routes/hospital.py
Hospital portal API endpoints.

GET    /hospital/dashboard                      — dashboard stats
GET    /hospital/profile                       — get hospital profile
POST   /hospital/profile                       — create hospital profile
PATCH  /hospital/profile                       — update hospital profile
GET    /hospital/requests                      — list emergency requests
GET    /hospital/requests/{request_id}          — get single request
POST   /hospital/requests/{request_id}/accept  — accept request
POST   /hospital/requests/{request_id}/reject  — reject request
POST   /hospital/requests/{request_id}/assign-doctor  — assign doctor
POST   /hospital/requests/{request_id}/assign-ambulance — assign ambulance
GET    /hospital/staff                          — list staff
POST   /hospital/staff                          — create staff
GET    /hospital/staff/{staff_id}              — get staff
PATCH  /hospital/staff/{staff_id}              — update staff
DELETE /hospital/staff/{staff_id}              — delete staff
GET    /hospital/beds                           — list beds
POST   /hospital/beds                           — create bed
GET    /hospital/beds/{bed_id}                 — get bed
PATCH  /hospital/beds/{bed_id}                 — update bed
PATCH  /hospital/beds/{bed_id}/availability    — update bed availability
DELETE /hospital/beds/{bed_id}                 — delete bed
GET    /hospital/ambulances                     — list ambulances
POST   /hospital/ambulances                     — create ambulance
GET    /hospital/ambulances/{ambulance_id}     — get ambulance
PATCH  /hospital/ambulances/{ambulance_id}     — update ambulance
PATCH  /hospital/ambulances/{ambulance_id}/status — update ambulance status
DELETE /hospital/ambulances/{ambulance_id}     — delete ambulance
GET    /hospital/assignments                    — list assignments
GET    /hospital/assignments/{assignment_id}    — get assignment
PATCH  /hospital/assignments/{assignment_id}    — update assignment

Security:
  - All endpoints require hospital role authentication
  - Hospitals can only access their own data (enforced by RLS)
  - Admins can access all hospital data
  - Critical operations use secure RPC functions
"""

from __future__ import annotations

import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.dependencies.auth import AuthContext, CurrentUser, get_auth_context, get_current_user
from app.api.dependencies.auth import create_user_supabase_client
from app.repositories.emergency_requests import EmergencyRequestRepository
from app.repositories.hospital import HospitalRepository
from app.schemas.common import APIResponse, PaginatedData
from app.schemas.emergency_request import EmergencyRequestResponse
from app.schemas.hospital import (
    AssignmentAmbulanceUpdate,
    AssignmentDoctorUpdate,
    AssignmentStatusUpdate,
    AssignmentTreatmentUpdate,
    AmbulanceStatusUpdate,
    BedAvailabilityUpdate,
    HospitalAmbulanceCreate,
    HospitalAmbulanceResponse,
    HospitalAmbulanceUpdate,
    HospitalAssignmentResponse,
    HospitalBedCreate,
    HospitalBedResponse,
    HospitalBedUpdate,
    HospitalDashboardStats,
    HospitalProfileCreate,
    HospitalProfileResponse,
    HospitalProfileUpdate,
    HospitalStaffCreate,
    HospitalStaffResponse,
    HospitalStaffUpdate,
)
from app.services.hospital_service import HospitalService
from app.utils.pagination import PaginationParams, get_pagination

router = APIRouter()
logger = logging.getLogger("medicare.routes.hospital")


def _get_service() -> HospitalService:
    return HospitalService()


def _get_repo() -> HospitalRepository:
    return HospitalRepository()


def _get_emergency_repo() -> EmergencyRequestRepository:
    return EmergencyRequestRepository()


# ── Dashboard ────────────────────────────────────────────────────────────────


@router.get(
    "/dashboard",
    response_model=APIResponse,
    summary="Get hospital dashboard statistics",
    description="Returns dashboard statistics for the authenticated hospital.",
    responses={
        200: {"description": "Dashboard statistics"},
        401: {"description": "Authentication required"},
        403: {"description": "Hospital role required"},
        404: {"description": "Hospital profile not found"},
    },
)
async def get_dashboard_stats(
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    service: Annotated[HospitalService, Depends(_get_service)],
) -> APIResponse:
    """Get dashboard statistics for the authenticated hospital."""
    # Get hospital profile to verify hospital role
    profile = service.get_profile(current_user.id)
    
    stats = service.get_dashboard_stats(str(profile.id))
    return APIResponse(
        success=True,
        message="Dashboard statistics retrieved successfully.",
        data=stats.model_dump(),
    )


# ── Hospital Profile ─────────────────────────────────────────────────────────


@router.get(
    "/profile",
    response_model=APIResponse,
    summary="Get hospital profile",
    description="Returns the hospital profile for the authenticated user.",
    responses={
        200: {"description": "Hospital profile"},
        401: {"description": "Authentication required"},
        404: {"description": "Hospital profile not found"},
    },
)
async def get_profile(
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    service: Annotated[HospitalService, Depends(_get_service)],
) -> APIResponse:
    """Get hospital profile for the authenticated user."""
    profile = service.get_profile(current_user.id)
    return APIResponse(
        success=True,
        message="Hospital profile retrieved successfully.",
        data=profile.model_dump(),
    )


@router.post(
    "/profile",
    response_model=APIResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create hospital profile",
    description="Create a new hospital profile for the authenticated user.",
    responses={
        201: {"description": "Hospital profile created"},
        400: {"description": "Profile already exists or validation error"},
        401: {"description": "Authentication required"},
    },
)
async def create_profile(
    payload: HospitalProfileCreate,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    service: Annotated[HospitalService, Depends(_get_service)],
) -> APIResponse:
    """Create a new hospital profile."""
    profile = service.create_profile(current_user.id, payload)
    return APIResponse(
        success=True,
        message="Hospital profile created successfully.",
        data=profile.model_dump(),
    )


@router.patch(
    "/profile",
    response_model=APIResponse,
    summary="Update hospital profile",
    description="Update the hospital profile for the authenticated user.",
    responses={
        200: {"description": "Hospital profile updated"},
        400: {"description": "Validation error"},
        401: {"description": "Authentication required"},
        404: {"description": "Hospital profile not found"},
    },
)
async def update_profile(
    payload: HospitalProfileUpdate,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    service: Annotated[HospitalService, Depends(_get_service)],
) -> APIResponse:
    """Update hospital profile for the authenticated user."""
    profile = service.update_profile(current_user.id, payload)
    return APIResponse(
        success=True,
        message="Hospital profile updated successfully.",
        data=profile.model_dump(),
    )


# ── Emergency Requests ──────────────────────────────────────────────────────


@router.get(
    "/requests",
    response_model=APIResponse,
    summary="List emergency requests for hospital",
    description="Returns a paginated list of emergency requests assigned to the hospital.",
    responses={
        200: {"description": "Paginated list of requests"},
        401: {"description": "Authentication required"},
        403: {"description": "Hospital role required"},
    },
)
async def list_requests(
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    service: Annotated[HospitalService, Depends(_get_service)],
    emergency_repo: Annotated[EmergencyRequestRepository, Depends(_get_emergency_repo)],
    pagination: Annotated[PaginationParams, Depends(get_pagination)],
    status: str | None = Query(default=None),
    severity: str | None = Query(default=None),
    emergency_type: str | None = Query(default=None),
    search: str | None = Query(default=None),
) -> APIResponse:
    """List emergency requests for the hospital."""
    # Get hospital profile
    profile = service.get_profile(current_user.id)
    
    # Get assignments for this hospital
    assignments = service.list_assignments(
        str(profile.id),
        status=status,
        limit=pagination.limit,
        offset=pagination.offset,
    )
    
    # Get emergency request IDs from assignments
    request_ids = [str(a.emergency_request_id) for a in assignments]
    
    if not request_ids:
        return APIResponse(
            success=True,
            message="No emergency requests found.",
            data=PaginatedData(
                items=[],
                page=pagination.page,
                page_size=pagination.page_size,
                total=0,
                has_next=False,
            ).model_dump(),
        )
    
    # Get emergency requests
    rows = []
    for req_id in request_ids:
        row = emergency_repo.get_by_id(req_id)
        if row:
            rows.append(row)
    
    # Apply additional filters
    if severity:
        rows = [r for r in rows if r.severity.value == severity]
    if emergency_type:
        rows = [r for r in rows if r.emergency_type.value == emergency_type]
    if search:
        rows = [r for r in rows if search.lower() in r.description.lower()]
    
    total = len(rows)
    paginated = PaginatedData(
        items=[EmergencyRequestResponse.model_validate(r).model_dump() for r in rows],
        page=pagination.page,
        page_size=pagination.page_size,
        total=total,
        has_next=(pagination.offset + pagination.limit) < total,
    )
    
    return APIResponse(
        success=True,
        message="Emergency requests retrieved successfully.",
        data=paginated.model_dump(),
    )


@router.get(
    "/requests/{request_id}",
    response_model=APIResponse,
    summary="Get single emergency request",
    description="Returns a single emergency request assigned to the hospital.",
    responses={
        200: {"description": "Emergency request"},
        401: {"description": "Authentication required"},
        403: {"description": "Hospital role required"},
        404: {"description": "Request not found"},
    },
)
async def get_request(
    request_id: str,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    service: Annotated[HospitalService, Depends(_get_service)],
    emergency_repo: Annotated[EmergencyRequestRepository, Depends(_get_emergency_repo)],
) -> APIResponse:
    """Get a single emergency request."""
    # Get hospital profile
    profile = service.get_profile(current_user.id)
    
    # Get assignment for this request
    assignment = service.get_assignment_by_request(request_id)
    if not assignment or str(assignment.hospital_id) != str(profile.id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Emergency request not found.",
        )
    
    # Get emergency request
    row = emergency_repo.get_by_id(request_id)
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Emergency request not found.",
        )
    
    return APIResponse(
        success=True,
        message="Emergency request retrieved successfully.",
        data=EmergencyRequestResponse.model_validate(row).model_dump(),
    )


@router.post(
    "/requests/{request_id}/accept",
    response_model=APIResponse,
    summary="Accept emergency request",
    description="Accept a pending emergency request as a hospital.",
    responses={
        200: {"description": "Request accepted"},
        400: {"description": "Request cannot be accepted"},
        401: {"description": "Authentication required"},
        404: {"description": "Request not found"},
    },
)
async def accept_request(
    request_id: str,
    auth_ctx: Annotated[AuthContext, Depends(get_auth_context)],
    service: Annotated[HospitalService, Depends(_get_service)],
) -> APIResponse:
    """Accept an emergency request."""
    user_client = create_user_supabase_client(auth_ctx.access_token)
    result = service.accept_request(
        request_id=request_id,
        user_id=auth_ctx.user.id,
        user_client=user_client,
    )
    return APIResponse(
        success=True,
        message="Emergency request accepted successfully.",
        data=result,
    )


@router.post(
    "/requests/{request_id}/reject",
    response_model=APIResponse,
    summary="Reject emergency request",
    description="Reject an accepted emergency request.",
    responses={
        200: {"description": "Request rejected"},
        400: {"description": "Request cannot be rejected"},
        401: {"description": "Authentication required"},
        404: {"description": "Request not found"},
    },
)
async def reject_request(
    request_id: str,
    auth_ctx: Annotated[AuthContext, Depends(get_auth_context)],
    service: Annotated[HospitalService, Depends(_get_service)],
    reason: str | None = None,
) -> APIResponse:
    """Reject an emergency request."""
    user_client = create_user_supabase_client(auth_ctx.access_token)
    result = service.reject_request(
        request_id=request_id,
        reason=reason,
        user_id=auth_ctx.user.id,
        user_client=user_client,
    )
    return APIResponse(
        success=True,
        message="Emergency request rejected successfully.",
        data=result,
    )


@router.post(
    "/requests/{request_id}/assign-doctor",
    response_model=APIResponse,
    summary="Assign doctor to request",
    description="Assign a doctor to an emergency request.",
    responses={
        200: {"description": "Doctor assigned"},
        400: {"description": "Invalid assignment"},
        401: {"description": "Authentication required"},
        404: {"description": "Request or doctor not found"},
    },
)
async def assign_doctor(
    request_id: str,
    payload: AssignmentDoctorUpdate,
    auth_ctx: Annotated[AuthContext, Depends(get_auth_context)],
    service: Annotated[HospitalService, Depends(_get_service)],
) -> APIResponse:
    """Assign a doctor to an emergency request."""
    user_client = create_user_supabase_client(auth_ctx.access_token)
    result = service.assign_doctor(
        request_id=request_id,
        doctor_id=str(payload.doctor_id),
        user_client=user_client,
    )
    return APIResponse(
        success=True,
        message="Doctor assigned successfully.",
        data=result,
    )


@router.post(
    "/requests/{request_id}/assign-ambulance",
    response_model=APIResponse,
    summary="Assign ambulance to request",
    description="Assign an ambulance to an emergency request.",
    responses={
        200: {"description": "Ambulance assigned"},
        400: {"description": "Invalid assignment"},
        401: {"description": "Authentication required"},
        404: {"description": "Request or ambulance not found"},
    },
)
async def assign_ambulance(
    request_id: str,
    payload: AssignmentAmbulanceUpdate,
    auth_ctx: Annotated[AuthContext, Depends(get_auth_context)],
    service: Annotated[HospitalService, Depends(_get_service)],
) -> APIResponse:
    """Assign an ambulance to an emergency request."""
    user_client = create_user_supabase_client(auth_ctx.access_token)
    result = service.assign_ambulance(
        request_id=request_id,
        ambulance_id=str(payload.ambulance_id),
        user_client=user_client,
    )
    return APIResponse(
        success=True,
        message="Ambulance assigned successfully.",
        data=result,
    )


# ── Hospital Staff ─────────────────────────────────────────────────────────


@router.get(
    "/staff",
    response_model=APIResponse,
    summary="List hospital staff",
    description="Returns a paginated list of hospital staff.",
    responses={
        200: {"description": "Paginated list of staff"},
        401: {"description": "Authentication required"},
        403: {"description": "Hospital role required"},
    },
)
async def list_staff(
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    service: Annotated[HospitalService, Depends(_get_service)],
    repo: Annotated[HospitalRepository, Depends(_get_repo)],
    pagination: Annotated[PaginationParams, Depends(get_pagination)],
    staff_type: str | None = Query(default=None),
    department: str | None = Query(default=None),
    is_available: bool | None = Query(default=None),
) -> APIResponse:
    """List hospital staff."""
    profile = service.get_profile(current_user.id)
    
    staff = service.list_staff(
        str(profile.id),
        staff_type=staff_type,
        department=department,
        is_available=is_available,
        limit=pagination.limit,
        offset=pagination.offset,
    )
    
    total = repo.count_staff(
        str(profile.id),
        staff_type=staff_type,
        department=department,
        is_available=is_available,
    )
    
    paginated = PaginatedData(
        items=[s.model_dump() for s in staff],
        page=pagination.page,
        page_size=pagination.page_size,
        total=total,
        has_next=(pagination.offset + pagination.limit) < total,
    )
    
    return APIResponse(
        success=True,
        message="Hospital staff retrieved successfully.",
        data=paginated.model_dump(),
    )


@router.post(
    "/staff",
    response_model=APIResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create staff member",
    description="Create a new staff member for the hospital.",
    responses={
        201: {"description": "Staff member created"},
        400: {"description": "Validation error"},
        401: {"description": "Authentication required"},
    },
)
async def create_staff(
    payload: HospitalStaffCreate,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    service: Annotated[HospitalService, Depends(_get_service)],
) -> APIResponse:
    """Create a new staff member."""
    profile = service.get_profile(current_user.id)
    staff = service.create_staff(str(profile.id), payload)
    return APIResponse(
        success=True,
        message="Staff member created successfully.",
        data=staff.model_dump(),
    )


@router.get(
    "/staff/{staff_id}",
    response_model=APIResponse,
    summary="Get staff member",
    description="Returns a single staff member by ID.",
    responses={
        200: {"description": "Staff member"},
        401: {"description": "Authentication required"},
        404: {"description": "Staff member not found"},
    },
)
async def get_staff(
    staff_id: str,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    service: Annotated[HospitalService, Depends(_get_service)],
) -> APIResponse:
    """Get a single staff member."""
    staff = service.get_staff(staff_id)
    return APIResponse(
        success=True,
        message="Staff member retrieved successfully.",
        data=staff.model_dump(),
    )


@router.patch(
    "/staff/{staff_id}",
    response_model=APIResponse,
    summary="Update staff member",
    description="Update a staff member.",
    responses={
        200: {"description": "Staff member updated"},
        400: {"description": "Validation error"},
        401: {"description": "Authentication required"},
        404: {"description": "Staff member not found"},
    },
)
async def update_staff(
    staff_id: str,
    payload: HospitalStaffUpdate,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    service: Annotated[HospitalService, Depends(_get_service)],
) -> APIResponse:
    """Update a staff member."""
    update_data = payload.model_dump(exclude_none=True)
    staff = service.update_staff(staff_id, update_data)
    return APIResponse(
        success=True,
        message="Staff member updated successfully.",
        data=staff.model_dump(),
    )


@router.delete(
    "/staff/{staff_id}",
    response_model=APIResponse,
    summary="Delete staff member",
    description="Delete a staff member (soft delete).",
    responses={
        200: {"description": "Staff member deleted"},
        401: {"description": "Authentication required"},
        404: {"description": "Staff member not found"},
    },
)
async def delete_staff(
    staff_id: str,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    service: Annotated[HospitalService, Depends(_get_service)],
) -> APIResponse:
    """Delete a staff member."""
    result = service.delete_staff(staff_id)
    return APIResponse(
        success=True,
        message=result["message"],
    )


# ── Hospital Beds ────────────────────────────────────────────────────────────


@router.get(
    "/beds",
    response_model=APIResponse,
    summary="List hospital beds",
    description="Returns a paginated list of hospital beds.",
    responses={
        200: {"description": "Paginated list of beds"},
        401: {"description": "Authentication required"},
        403: {"description": "Hospital role required"},
    },
)
async def list_beds(
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    service: Annotated[HospitalService, Depends(_get_service)],
    repo: Annotated[HospitalRepository, Depends(_get_repo)],
    pagination: Annotated[PaginationParams, Depends(get_pagination)],
    bed_type: str | None = Query(default=None),
    is_available: bool | None = Query(default=None),
    ward: str | None = Query(default=None),
) -> APIResponse:
    """List hospital beds."""
    profile = service.get_profile(current_user.id)
    
    beds = service.list_beds(
        str(profile.id),
        bed_type=bed_type,
        is_available=is_available,
        ward=ward,
        limit=pagination.limit,
        offset=pagination.offset,
    )
    
    total = repo.count_beds(
        str(profile.id),
        bed_type=bed_type,
        is_available=is_available,
    )
    
    paginated = PaginatedData(
        items=[b.model_dump() for b in beds],
        page=pagination.page,
        page_size=pagination.page_size,
        total=total,
        has_next=(pagination.offset + pagination.limit) < total,
    )
    
    return APIResponse(
        success=True,
        message="Hospital beds retrieved successfully.",
        data=paginated.model_dump(),
    )


@router.post(
    "/beds",
    response_model=APIResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create bed",
    description="Create a new bed for the hospital.",
    responses={
        201: {"description": "Bed created"},
        400: {"description": "Validation error"},
        401: {"description": "Authentication required"},
    },
)
async def create_bed(
    payload: HospitalBedCreate,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    service: Annotated[HospitalService, Depends(_get_service)],
) -> APIResponse:
    """Create a new bed."""
    profile = service.get_profile(current_user.id)
    bed = service.create_bed(str(profile.id), payload)
    return APIResponse(
        success=True,
        message="Bed created successfully.",
        data=bed.model_dump(),
    )


@router.get(
    "/beds/{bed_id}",
    response_model=APIResponse,
    summary="Get bed",
    description="Returns a single bed by ID.",
    responses={
        200: {"description": "Bed"},
        401: {"description": "Authentication required"},
        404: {"description": "Bed not found"},
    },
)
async def get_bed(
    bed_id: str,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    service: Annotated[HospitalService, Depends(_get_service)],
) -> APIResponse:
    """Get a single bed."""
    bed = service.get_bed(bed_id)
    return APIResponse(
        success=True,
        message="Bed retrieved successfully.",
        data=bed.model_dump(),
    )


@router.patch(
    "/beds/{bed_id}",
    response_model=APIResponse,
    summary="Update bed",
    description="Update a bed.",
    responses={
        200: {"description": "Bed updated"},
        400: {"description": "Validation error"},
        401: {"description": "Authentication required"},
        404: {"description": "Bed not found"},
    },
)
async def update_bed(
    bed_id: str,
    payload: HospitalBedUpdate,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    service: Annotated[HospitalService, Depends(_get_service)],
) -> APIResponse:
    """Update a bed."""
    update_data = payload.model_dump(exclude_none=True)
    bed = service.update_bed(bed_id, update_data)
    return APIResponse(
        success=True,
        message="Bed updated successfully.",
        data=bed.model_dump(),
    )


@router.patch(
    "/beds/{bed_id}/availability",
    response_model=APIResponse,
    summary="Update bed availability",
    description="Update bed availability status via RPC.",
    responses={
        200: {"description": "Bed availability updated"},
        400: {"description": "Validation error"},
        401: {"description": "Authentication required"},
        404: {"description": "Bed not found"},
    },
)
async def update_bed_availability(
    bed_id: str,
    payload: BedAvailabilityUpdate,
    auth_ctx: Annotated[AuthContext, Depends(get_auth_context)],
    service: Annotated[HospitalService, Depends(_get_service)],
) -> APIResponse:
    """Update bed availability via RPC."""
    user_client = create_user_supabase_client(auth_ctx.access_token)
    result = service.update_bed_availability(
        bed_id=bed_id,
        is_available=payload.is_available,
        is_occupied=payload.is_occupied,
        user_client=user_client,
    )
    return APIResponse(
        success=True,
        message="Bed availability updated successfully.",
        data=result,
    )


@router.delete(
    "/beds/{bed_id}",
    response_model=APIResponse,
    summary="Delete bed",
    description="Delete a bed (soft delete).",
    responses={
        200: {"description": "Bed deleted"},
        401: {"description": "Authentication required"},
        404: {"description": "Bed not found"},
    },
)
async def delete_bed(
    bed_id: str,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    service: Annotated[HospitalService, Depends(_get_service)],
) -> APIResponse:
    """Delete a bed."""
    result = service.delete_bed(bed_id)
    return APIResponse(
        success=True,
        message=result["message"],
    )


# ── Hospital Ambulances ──────────────────────────────────────────────────────


@router.get(
    "/ambulances",
    response_model=APIResponse,
    summary="List hospital ambulances",
    description="Returns a paginated list of ambulances.",
    responses={
        200: {"description": "Paginated list of ambulances"},
        401: {"description": "Authentication required"},
        403: {"description": "Hospital role required"},
    },
)
async def list_ambulances(
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    service: Annotated[HospitalService, Depends(_get_service)],
    repo: Annotated[HospitalRepository, Depends(_get_repo)],
    pagination: Annotated[PaginationParams, Depends(get_pagination)],
    status: str | None = Query(default=None),
    vehicle_type: str | None = Query(default=None),
) -> APIResponse:
    """List hospital ambulances."""
    profile = service.get_profile(current_user.id)
    
    ambulances = service.list_ambulances(
        str(profile.id),
        status=status,
        vehicle_type=vehicle_type,
        limit=pagination.limit,
        offset=pagination.offset,
    )
    
    total = repo.count_ambulances(
        str(profile.id),
        status=status,
    )
    
    paginated = PaginatedData(
        items=[a.model_dump() for a in ambulances],
        page=pagination.page,
        page_size=pagination.page_size,
        total=total,
        has_next=(pagination.offset + pagination.limit) < total,
    )
    
    return APIResponse(
        success=True,
        message="Hospital ambulances retrieved successfully.",
        data=paginated.model_dump(),
    )


@router.post(
    "/ambulances",
    response_model=APIResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create ambulance",
    description="Create a new ambulance for the hospital.",
    responses={
        201: {"description": "Ambulance created"},
        400: {"description": "Validation error"},
        401: {"description": "Authentication required"},
    },
)
async def create_ambulance(
    payload: HospitalAmbulanceCreate,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    service: Annotated[HospitalService, Depends(_get_service)],
) -> APIResponse:
    """Create a new ambulance."""
    profile = service.get_profile(current_user.id)
    ambulance = service.create_ambulance(str(profile.id), payload)
    return APIResponse(
        success=True,
        message="Ambulance created successfully.",
        data=ambulance.model_dump(),
    )


@router.get(
    "/ambulances/{ambulance_id}",
    response_model=APIResponse,
    summary="Get ambulance",
    description="Returns a single ambulance by ID.",
    responses={
        200: {"description": "Ambulance"},
        401: {"description": "Authentication required"},
        404: {"description": "Ambulance not found"},
    },
)
async def get_ambulance(
    ambulance_id: str,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    service: Annotated[HospitalService, Depends(_get_service)],
) -> APIResponse:
    """Get a single ambulance."""
    ambulance = service.get_ambulance(ambulance_id)
    return APIResponse(
        success=True,
        message="Ambulance retrieved successfully.",
        data=ambulance.model_dump(),
    )


@router.patch(
    "/ambulances/{ambulance_id}",
    response_model=APIResponse,
    summary="Update ambulance",
    description="Update an ambulance.",
    responses={
        200: {"description": "Ambulance updated"},
        400: {"description": "Validation error"},
        401: {"description": "Authentication required"},
        404: {"description": "Ambulance not found"},
    },
)
async def update_ambulance(
    ambulance_id: str,
    payload: HospitalAmbulanceUpdate,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    service: Annotated[HospitalService, Depends(_get_service)],
) -> APIResponse:
    """Update an ambulance."""
    update_data = payload.model_dump(exclude_none=True)
    ambulance = service.update_ambulance(ambulance_id, update_data)
    return APIResponse(
        success=True,
        message="Ambulance updated successfully.",
        data=ambulance.model_dump(),
    )


@router.patch(
    "/ambulances/{ambulance_id}/status",
    response_model=APIResponse,
    summary="Update ambulance status",
    description="Update ambulance status via RPC.",
    responses={
        200: {"description": "Ambulance status updated"},
        400: {"description": "Validation error"},
        401: {"description": "Authentication required"},
        404: {"description": "Ambulance not found"},
    },
)
async def update_ambulance_status(
    ambulance_id: str,
    payload: AmbulanceStatusUpdate,
    auth_ctx: Annotated[AuthContext, Depends(get_auth_context)],
    service: Annotated[HospitalService, Depends(_get_service)],
) -> APIResponse:
    """Update ambulance status via RPC."""
    user_client = create_user_supabase_client(auth_ctx.access_token)
    result = service.update_ambulance_status(
        ambulance_id=ambulance_id,
        status=payload.status,
        current_latitude=payload.current_latitude,
        current_longitude=payload.current_longitude,
        user_client=user_client,
    )
    return APIResponse(
        success=True,
        message="Ambulance status updated successfully.",
        data=result,
    )


@router.delete(
    "/ambulances/{ambulance_id}",
    response_model=APIResponse,
    summary="Delete ambulance",
    description="Delete an ambulance (soft delete).",
    responses={
        200: {"description": "Ambulance deleted"},
        401: {"description": "Authentication required"},
        404: {"description": "Ambulance not found"},
    },
)
async def delete_ambulance(
    ambulance_id: str,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    service: Annotated[HospitalService, Depends(_get_service)],
) -> APIResponse:
    """Delete an ambulance."""
    result = service.delete_ambulance(ambulance_id)
    return APIResponse(
        success=True,
        message=result["message"],
    )


# ── Hospital Assignments ─────────────────────────────────────────────────────


@router.get(
    "/assignments",
    response_model=APIResponse,
    summary="List hospital assignments",
    description="Returns a paginated list of hospital assignments.",
    responses={
        200: {"description": "Paginated list of assignments"},
        401: {"description": "Authentication required"},
        403: {"description": "Hospital role required"},
    },
)
async def list_assignments(
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    service: Annotated[HospitalService, Depends(_get_service)],
    repo: Annotated[HospitalRepository, Depends(_get_repo)],
    pagination: Annotated[PaginationParams, Depends(get_pagination)],
    status: str | None = Query(default=None),
) -> APIResponse:
    """List hospital assignments."""
    profile = service.get_profile(current_user.id)
    
    assignments = service.list_assignments(
        str(profile.id),
        status=status,
        limit=pagination.limit,
        offset=pagination.offset,
    )
    
    total = repo.count_assignments(
        str(profile.id),
        status=status,
    )
    
    paginated = PaginatedData(
        items=[a.model_dump() for a in assignments],
        page=pagination.page,
        page_size=pagination.page_size,
        total=total,
        has_next=(pagination.offset + pagination.limit) < total,
    )
    
    return APIResponse(
        success=True,
        message="Hospital assignments retrieved successfully.",
        data=paginated.model_dump(),
    )


@router.get(
    "/assignments/{assignment_id}",
    response_model=APIResponse,
    summary="Get assignment",
    description="Returns a single assignment by ID.",
    responses={
        200: {"description": "Assignment"},
        401: {"description": "Authentication required"},
        404: {"description": "Assignment not found"},
    },
)
async def get_assignment(
    assignment_id: str,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    service: Annotated[HospitalService, Depends(_get_service)],
) -> APIResponse:
    """Get a single assignment."""
    assignment = service.get_assignment(assignment_id)
    return APIResponse(
        success=True,
        message="Assignment retrieved successfully.",
        data=assignment.model_dump(),
    )


@router.patch(
    "/assignments/{assignment_id}",
    response_model=APIResponse,
    summary="Update assignment",
    description="Update an assignment.",
    responses={
        200: {"description": "Assignment updated"},
        400: {"description": "Validation error"},
        401: {"description": "Authentication required"},
        404: {"description": "Assignment not found"},
    },
)
async def update_assignment(
    assignment_id: str,
    payload: AssignmentTreatmentUpdate | AssignmentStatusUpdate,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    service: Annotated[HospitalService, Depends(_get_service)],
) -> APIResponse:
    """Update an assignment."""
    update_data = payload.model_dump(exclude_none=True)
    assignment = service.update_assignment(assignment_id, update_data)
    return APIResponse(
        success=True,
        message="Assignment updated successfully.",
        data=assignment.model_dump(),
    )
