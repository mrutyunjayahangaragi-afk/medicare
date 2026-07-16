"""
app/api/v1/routes/responder.py
Responder-only API endpoints.

All routes require the require_responder dependency.

GET  /responder/requests/available              — pending unassigned requests
GET  /responder/requests/assigned               — requests assigned to me
GET  /responder/requests/{request_id}           — single request
POST /responder/requests/{request_id}/accept    — accept via RPC
POST /responder/requests/{request_id}/start     — transition → in_progress
POST /responder/requests/{request_id}/arrive    — transition → arrived
POST /responder/requests/{request_id}/complete  — transition → completed
PUT  /responder/availability                    — update availability
PUT  /responder/location/{request_id}           — update GPS location
GET  /responder/location/{request_id}           — get latest GPS location
"""

from __future__ import annotations

import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.dependencies.auth import AuthContext, CurrentUser, get_auth_context, get_current_user
from app.api.dependencies.auth import create_user_supabase_client
from app.api.dependencies.roles import require_responder
from app.repositories.emergency_requests import EmergencyRequestRepository
from app.schemas.common import APIResponse, PaginatedData
from app.schemas.database.emergency_request import EmergencySeverity
from app.schemas.emergency_request import EmergencyRequestResponse
from app.schemas.responder import AvailabilityUpdateRequest, LocationUpdateRequest
from app.services.emergency_request_service import EmergencyRequestService
from app.services.responder_service import ResponderService
from app.utils.pagination import PaginationParams, get_pagination

router = APIRouter()
logger = logging.getLogger("medicare.routes.responder")


def _get_req_service() -> EmergencyRequestService:
    return EmergencyRequestService()


def _get_responder_service() -> ResponderService:
    return ResponderService()


def _get_req_repo() -> EmergencyRequestRepository:
    return EmergencyRequestRepository()


@router.get(
    "/requests/available",
    response_model=APIResponse,
    summary="List available requests",
    description=(
        "Returns pending, unassigned emergency requests visible to responders, "
        "ordered by severity (critical first) then age (oldest first)."
    ),
    responses={
        200: {"description": "Available requests"},
        401: {"description": "Authentication required"},
        403: {"description": "Responder role required"},
    },
)
async def list_available_requests(
    current_user: Annotated[CurrentUser, Depends(require_responder)],
    repo: Annotated[EmergencyRequestRepository, Depends(_get_req_repo)],
    pagination: Annotated[PaginationParams, Depends(get_pagination)],
    severity: EmergencySeverity | None = Query(default=None),
) -> APIResponse:
    rows = repo.list_pending_unassigned(
        limit=pagination.limit,
        offset=pagination.offset,
        severity=severity.value if severity else None,
    )
    paginated: PaginatedData[dict] = PaginatedData(
        items=[EmergencyRequestResponse.model_validate(r).model_dump() for r in rows],
        page=pagination.page,
        page_size=pagination.page_size,
        total=len(rows),
        has_next=False,
    )
    return APIResponse(
        success=True,
        message="Available requests retrieved.",
        data=paginated.model_dump(),
    )


@router.get(
    "/requests/assigned",
    response_model=APIResponse,
    summary="List assigned requests",
    description="Returns all active requests currently assigned to the authenticated responder.",
    responses={
        200: {"description": "Assigned requests"},
        401: {"description": "Authentication required"},
        403: {"description": "Responder role required"},
    },
)
async def list_assigned_requests(
    current_user: Annotated[CurrentUser, Depends(require_responder)],
    repo: Annotated[EmergencyRequestRepository, Depends(_get_req_repo)],
    pagination: Annotated[PaginationParams, Depends(get_pagination)],
) -> APIResponse:
    rows = repo.list_assigned_to_responder(
        responder_id=current_user.id,
        limit=pagination.limit,
        offset=pagination.offset,
    )
    return APIResponse(
        success=True,
        message="Assigned requests retrieved.",
        data=[EmergencyRequestResponse.model_validate(r).model_dump() for r in rows],
    )


@router.get(
    "/requests/{request_id}",
    response_model=APIResponse,
    summary="Get a single request (responder view)",
    description=(
        "Returns an emergency request. Accessible if the request is pending/unassigned "
        "or assigned to the authenticated responder."
    ),
    responses={
        200: {"description": "Request found"},
        401: {"description": "Authentication required"},
        403: {"description": "Responder role required"},
        404: {"description": "Not found or inaccessible"},
    },
)
async def get_responder_request(
    request_id: str,
    current_user: Annotated[CurrentUser, Depends(require_responder)],
    repo: Annotated[EmergencyRequestRepository, Depends(_get_req_repo)],
) -> APIResponse:
    row = repo.get_for_responder(request_id, current_user.id)
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Emergency request not found.",
        )
    return APIResponse(
        success=True,
        message="Request retrieved.",
        data=EmergencyRequestResponse.model_validate(row).model_dump(),
    )


@router.post(
    "/requests/{request_id}/accept",
    response_model=APIResponse,
    summary="Accept a request",
    description=(
        "Atomically accept a pending request using the accept_emergency_request RPC. "
        "Returns 409 if another responder accepted first."
    ),
    responses={
        200: {"description": "Request accepted"},
        401: {"description": "Authentication required"},
        403: {"description": "Responder role required"},
        404: {"description": "Not found"},
        409: {"description": "Already accepted by another responder"},
    },
)
async def accept_request(
    request_id: str,
    auth_ctx: Annotated[AuthContext, Depends(get_auth_context)],
    _responder: Annotated[CurrentUser, Depends(require_responder)],
    service: Annotated[EmergencyRequestService, Depends(_get_req_service)],
) -> APIResponse:
    user_client = create_user_supabase_client(auth_ctx.access_token)
    try:
        result = service.accept_request(request_id, auth_ctx.user.id, user_client)
    except Exception as exc:
        err_msg = str(exc).lower()
        if "already" in err_msg or "conflict" in err_msg or "accepted" in err_msg:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This request has already been accepted by another responder.",
            ) from exc
        raise
    return APIResponse(
        success=True,
        message="Request accepted.",
        data=result,
    )


@router.post(
    "/requests/{request_id}/start",
    response_model=APIResponse,
    summary="Start a request (→ in_progress)",
    description="Transition an accepted request to in_progress using the secure RPC.",
    responses={
        200: {"description": "Status updated"},
        400: {"description": "Invalid transition"},
        401: {"description": "Authentication required"},
        403: {"description": "Not assigned"},
    },
)
async def start_request(
    request_id: str,
    auth_ctx: Annotated[AuthContext, Depends(get_auth_context)],
    _responder: Annotated[CurrentUser, Depends(require_responder)],
    service: Annotated[EmergencyRequestService, Depends(_get_req_service)],
) -> APIResponse:
    user_client = create_user_supabase_client(auth_ctx.access_token)
    result = service.transition_status(request_id, "start", auth_ctx.user.id, user_client)
    return APIResponse(success=True, message="Request status updated to in_progress.", data=result)


@router.post(
    "/requests/{request_id}/arrive",
    response_model=APIResponse,
    summary="Arrive at a request (→ arrived)",
    description="Transition an in_progress request to arrived using the secure RPC.",
)
async def arrive_request(
    request_id: str,
    auth_ctx: Annotated[AuthContext, Depends(get_auth_context)],
    _responder: Annotated[CurrentUser, Depends(require_responder)],
    service: Annotated[EmergencyRequestService, Depends(_get_req_service)],
) -> APIResponse:
    user_client = create_user_supabase_client(auth_ctx.access_token)
    result = service.transition_status(request_id, "arrive", auth_ctx.user.id, user_client)
    return APIResponse(success=True, message="Request status updated to arrived.", data=result)


@router.post(
    "/requests/{request_id}/complete",
    response_model=APIResponse,
    summary="Complete a request (→ completed)",
    description="Transition a request to completed using the secure RPC.",
)
async def complete_request(
    request_id: str,
    auth_ctx: Annotated[AuthContext, Depends(get_auth_context)],
    _responder: Annotated[CurrentUser, Depends(require_responder)],
    service: Annotated[EmergencyRequestService, Depends(_get_req_service)],
) -> APIResponse:
    user_client = create_user_supabase_client(auth_ctx.access_token)
    result = service.transition_status(request_id, "complete", auth_ctx.user.id, user_client)
    return APIResponse(success=True, message="Request completed.", data=result)


@router.put(
    "/availability",
    response_model=APIResponse,
    summary="Update availability status",
    description=(
        "Update the authenticated responder's availability. "
        "Allowed values: available, busy, offline."
    ),
    responses={
        200: {"description": "Availability updated"},
        401: {"description": "Authentication required"},
        403: {"description": "Responder role required"},
    },
)
async def update_availability(
    payload: AvailabilityUpdateRequest,
    auth_ctx: Annotated[AuthContext, Depends(get_auth_context)],
    _responder: Annotated[CurrentUser, Depends(require_responder)],
    service: Annotated[ResponderService, Depends(_get_responder_service)],
) -> APIResponse:
    user_client = create_user_supabase_client(auth_ctx.access_token)
    service.update_availability(auth_ctx.user.id, payload.availability_status, user_client)
    return APIResponse(
        success=True,
        message=f"Availability updated to {payload.availability_status.value}.",
        data={"availability_status": payload.availability_status.value},
    )


@router.put(
    "/location/{request_id}",
    response_model=APIResponse,
    summary="Update responder location",
    description=(
        "Upsert the authenticated responder's GPS position for an active request. "
        "Only the assigned responder may update the location."
    ),
    responses={
        200: {"description": "Location updated"},
        401: {"description": "Authentication required"},
        403: {"description": "Not assigned to this request"},
        404: {"description": "Request not found"},
    },
)
async def update_location(
    request_id: str,
    payload: LocationUpdateRequest,
    auth_ctx: Annotated[AuthContext, Depends(get_auth_context)],
    _responder: Annotated[CurrentUser, Depends(require_responder)],
    service: Annotated[ResponderService, Depends(_get_responder_service)],
) -> APIResponse:
    user_client = create_user_supabase_client(auth_ctx.access_token)
    result = service.update_location(
        request_id=request_id,
        responder_id=auth_ctx.user.id,
        latitude=payload.latitude,
        longitude=payload.longitude,
        heading=payload.heading,
        speed=payload.speed,
        accuracy=payload.accuracy,
        user_client=user_client,
    )
    return APIResponse(
        success=True,
        message="Responder location updated.",
        data=result,
    )


@router.get(
    "/location/{request_id}",
    response_model=APIResponse,
    summary="Get responder location",
    description=(
        "Returns the latest responder location for a request. "
        "Accessible by the request owner or the assigned responder."
    ),
    responses={
        200: {"description": "Location found"},
        401: {"description": "Authentication required"},
        403: {"description": "Not a participant"},
        404: {"description": "Not found"},
    },
)
async def get_location(
    request_id: str,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    service: Annotated[ResponderService, Depends(_get_responder_service)],
) -> APIResponse:
    location = service.get_location(request_id, current_user.id)
    if location is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Responder location not found.",
        )
    return APIResponse(
        success=True,
        message="Responder location retrieved.",
        data=location,
    )
