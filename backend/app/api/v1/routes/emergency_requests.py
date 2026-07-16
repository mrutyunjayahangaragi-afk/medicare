"""
app/api/v1/routes/emergency_requests.py
Emergency request API endpoints.

POST   /emergency-requests                        — create
GET    /emergency-requests                        — list own requests (paginated)
GET    /emergency-requests/{request_id}           — get single own request
POST   /emergency-requests/{request_id}/cancel   — cancel via secure RPC

Security:
  - user_id is always set from the token, never from the request body.
  - status, assigned_responder_id, and timestamps are server-controlled.
  - Cancel uses the DB RPC to enforce the state machine.
  - A 404 is returned for inaccessible requests (does not reveal existence).
"""

from __future__ import annotations

import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.dependencies.auth import AuthContext, CurrentUser, get_auth_context, get_current_user
from app.api.dependencies.auth import create_user_supabase_client
from app.repositories.emergency_requests import EmergencyRequestRepository
from app.schemas.common import APIResponse, PaginatedData
from app.schemas.database.emergency_request import (
    EmergencyRequestStatus,
    EmergencySeverity,
    EmergencyType,
)
from app.schemas.emergency_request import EmergencyRequestCreate, EmergencyRequestResponse
from app.services.emergency_request_service import EmergencyRequestService
from app.utils.pagination import PaginationParams, get_pagination

router = APIRouter()
logger = logging.getLogger("medicare.routes.emergency_requests")


def _get_service() -> EmergencyRequestService:
    return EmergencyRequestService()


def _get_repo() -> EmergencyRequestRepository:
    return EmergencyRequestRepository()


@router.post(
    "",
    response_model=APIResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create emergency request",
    description=(
        "Submit a new emergency request. "
        "user_id is always set from the authenticated token — "
        "providing user_id in the request body is rejected. "
        "Either GPS coordinates or manual_address must be provided."
    ),
    responses={
        201: {"description": "Request created"},
        400: {"description": "Validation or business rule failure"},
        401: {"description": "Authentication required"},
        422: {"description": "Validation error"},
    },
)
async def create_request(
    payload: EmergencyRequestCreate,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    service: Annotated[EmergencyRequestService, Depends(_get_service)],
) -> APIResponse:
    """Create an emergency request for the authenticated user."""
    row = service.create_request(user_id=current_user.id, payload=payload)
    return APIResponse(
        success=True,
        message="Emergency request created successfully.",
        data=EmergencyRequestResponse.model_validate(row).model_dump(),
    )


@router.get(
    "",
    response_model=APIResponse,
    summary="List own emergency requests",
    description=(
        "Returns a paginated list of the authenticated user's emergency requests, "
        "newest first. Supports filtering by status, severity, type, and search."
    ),
    responses={
        200: {"description": "Paginated list of requests"},
        401: {"description": "Authentication required"},
    },
)
async def list_requests(
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    repo: Annotated[EmergencyRequestRepository, Depends(_get_repo)],
    pagination: Annotated[PaginationParams, Depends(get_pagination)],
    req_status: EmergencyRequestStatus | None = Query(default=None, alias="status"),
    severity: EmergencySeverity | None = Query(default=None),
    emergency_type: EmergencyType | None = Query(default=None),
    search: str | None = Query(default=None, max_length=100),
) -> APIResponse:
    """Return the current user's emergency requests with optional filters."""
    status_val = req_status.value if req_status else None
    severity_val = severity.value if severity else None
    type_val = emergency_type.value if emergency_type else None

    rows = repo.list_for_user(
        user_id=current_user.id,
        limit=pagination.limit,
        offset=pagination.offset,
        status=status_val,
        severity=severity_val,
        emergency_type=type_val,
        search=search,
    )
    total = repo.count_for_user(
        user_id=current_user.id,
        status=status_val,
        severity=severity_val,
        emergency_type=type_val,
        search=search,
    )

    paginated: PaginatedData[dict] = PaginatedData(
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
    "/{request_id}",
    response_model=APIResponse,
    summary="Get a single emergency request",
    description=(
        "Returns one emergency request owned by the authenticated user. "
        "Returns 404 whether the request does not exist or belongs to another user — "
        "this prevents user enumeration."
    ),
    responses={
        200: {"description": "Request found"},
        401: {"description": "Authentication required"},
        404: {"description": "Not found"},
    },
)
async def get_request(
    request_id: str,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    repo: Annotated[EmergencyRequestRepository, Depends(_get_repo)],
) -> APIResponse:
    """Return a single emergency request owned by the authenticated user."""
    row = repo.get_by_id(request_id, user_id=current_user.id)
    if row is None:
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
    "/{request_id}/cancel",
    response_model=APIResponse,
    summary="Cancel an emergency request",
    description=(
        "Cancel a pending or accepted emergency request owned by the authenticated user. "
        "Uses the secure cancel_emergency_request RPC to enforce the state machine. "
        "Terminal requests (completed, cancelled) cannot be cancelled."
    ),
    responses={
        200: {"description": "Cancelled successfully"},
        400: {"description": "Request cannot be cancelled in its current state"},
        401: {"description": "Authentication required"},
        404: {"description": "Not found"},
    },
)
async def cancel_request(
    request_id: str,
    auth_ctx: Annotated[AuthContext, Depends(get_auth_context)],
    service: Annotated[EmergencyRequestService, Depends(_get_service)],
) -> APIResponse:
    """Cancel the user's emergency request via the secure RPC."""
    user_client = create_user_supabase_client(auth_ctx.access_token)
    result = service.cancel_request(
        request_id=request_id,
        user_id=auth_ctx.user.id,
        user_client=user_client,
    )
    return APIResponse(
        success=True,
        message="Emergency request cancelled successfully.",
        data=result,
    )
