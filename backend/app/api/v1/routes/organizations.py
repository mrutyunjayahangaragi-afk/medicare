"""
app/api/v1/routes/organizations.py
Organization API endpoints.

GET   /organizations                               — list verified orgs
GET   /organizations/me                            — my organization
GET   /organizations/{organization_id}             — single verified org
GET   /organizations/{organization_id}/members     — list members (owner/manager)
POST  /organizations/{organization_id}/members     — add member (owner/manager)
PATCH /organizations/{organization_id}/members/{member_id} — update member
"""

from __future__ import annotations

import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.dependencies.auth import CurrentUser, get_current_user
from app.repositories.organizations import OrganizationRepository
from app.repositories.profiles import ProfileRepository
from app.schemas.common import APIResponse, PaginatedData
from app.schemas.organization import AddMemberRequest, UpdateMemberRequest
from app.utils.pagination import PaginationParams, get_pagination

router = APIRouter()
logger = logging.getLogger("medicare.routes.organizations")

_MANAGER_ROLES = {"owner", "manager", "admin"}


def _get_org_repo() -> OrganizationRepository:
    return OrganizationRepository()


def _get_profile_repo() -> ProfileRepository:
    return ProfileRepository()


@router.get(
    "",
    response_model=APIResponse,
    summary="List verified organizations",
    description=(
        "Returns a paginated list of verified organizations. "
        "Only is_verified=true organizations are returned. "
        "Internal verification notes are excluded."
    ),
    responses={
        200: {"description": "Organizations list"},
        401: {"description": "Authentication required"},
    },
)
async def list_organizations(
    _current_user: Annotated[CurrentUser, Depends(get_current_user)],
    repo: Annotated[OrganizationRepository, Depends(_get_org_repo)],
    pagination: Annotated[PaginationParams, Depends(get_pagination)],
) -> APIResponse:
    orgs = repo.list_verified(limit=pagination.limit, offset=pagination.offset)
    total = repo.count_verified()
    paginated: PaginatedData[dict] = PaginatedData(
        items=[o.model_dump() for o in orgs],
        page=pagination.page,
        page_size=pagination.page_size,
        total=total,
        has_next=(pagination.offset + pagination.limit) < total,
    )
    return APIResponse(
        success=True,
        message="Organizations retrieved successfully.",
        data=paginated.model_dump(),
    )


@router.get(
    "/me",
    response_model=APIResponse,
    summary="Get my organization",
    description="Returns the organization associated with the authenticated user's profile.",
    responses={
        200: {"description": "Organization found"},
        401: {"description": "Authentication required"},
        404: {"description": "Not a member of any organization"},
    },
)
async def get_my_organization(
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    repo: Annotated[OrganizationRepository, Depends(_get_org_repo)],
) -> APIResponse:
    org = repo.get_my_organization(current_user.id)
    if org is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="You are not associated with any organization.",
        )
    return APIResponse(
        success=True,
        message="Organization retrieved successfully.",
        data=org.model_dump(),
    )


@router.get(
    "/{organization_id}",
    response_model=APIResponse,
    summary="Get a single organization",
    description="Returns a verified organization by ID. Returns 404 for unverified organizations.",
    responses={
        200: {"description": "Organization found"},
        401: {"description": "Authentication required"},
        404: {"description": "Not found"},
    },
)
async def get_organization(
    organization_id: str,
    _current_user: Annotated[CurrentUser, Depends(get_current_user)],
    repo: Annotated[OrganizationRepository, Depends(_get_org_repo)],
) -> APIResponse:
    org = repo.get_verified_by_id(organization_id)
    if org is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found.",
        )
    return APIResponse(
        success=True,
        message="Organization retrieved successfully.",
        data=org.model_dump(),
    )


@router.get(
    "/{organization_id}/members",
    response_model=APIResponse,
    summary="List organization members",
    description=(
        "Returns members of an organization. "
        "Requires the caller to be an owner or manager of the organization."
    ),
    responses={
        200: {"description": "Members list"},
        401: {"description": "Authentication required"},
        403: {"description": "Owner/manager role required"},
        404: {"description": "Organization not found"},
    },
)
async def list_members(
    organization_id: str,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    repo: Annotated[OrganizationRepository, Depends(_get_org_repo)],
    pagination: Annotated[PaginationParams, Depends(get_pagination)],
) -> APIResponse:
    _require_org_manager(repo, organization_id, current_user.id)
    members = repo.list_members(
        organization_id, limit=pagination.limit, offset=pagination.offset
    )
    return APIResponse(
        success=True,
        message="Members retrieved successfully.",
        data=[m.model_dump() for m in members],
    )


@router.post(
    "/{organization_id}/members",
    response_model=APIResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add a member to an organization",
    description="Add a user to an organization in pending status. Requires owner/manager role.",
    responses={
        201: {"description": "Member added"},
        401: {"description": "Authentication required"},
        403: {"description": "Owner/manager role required"},
        404: {"description": "Organization not found"},
    },
)
async def add_member(
    organization_id: str,
    payload: AddMemberRequest,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    repo: Annotated[OrganizationRepository, Depends(_get_org_repo)],
) -> APIResponse:
    _require_org_manager(repo, organization_id, current_user.id)
    member = repo.add_member(organization_id, str(payload.user_id))
    return APIResponse(
        success=True,
        message="Member added successfully.",
        data=member.model_dump(),
    )


@router.patch(
    "/{organization_id}/members/{member_id}",
    response_model=APIResponse,
    summary="Update a member's role or status",
    description="Update a member's role or approval status. Requires owner/manager role.",
    responses={
        200: {"description": "Member updated"},
        401: {"description": "Authentication required"},
        403: {"description": "Owner/manager role required"},
        404: {"description": "Member or organization not found"},
    },
)
async def update_member(
    organization_id: str,
    member_id: str,
    payload: UpdateMemberRequest,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    repo: Annotated[OrganizationRepository, Depends(_get_org_repo)],
) -> APIResponse:
    _require_org_manager(repo, organization_id, current_user.id)
    updates = payload.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No updatable fields provided.",
        )
    updated = repo.update_member(organization_id, member_id, updates)
    if updated is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Member not found.",
        )
    return APIResponse(
        success=True,
        message="Member updated successfully.",
        data=updated.model_dump(),
    )


# ── Helper ────────────────────────────────────────────────────────────────

def _require_org_manager(
    repo: OrganizationRepository,
    org_id: str,
    user_id: str,
) -> None:
    """Raise 403 if the user is not an active owner/manager of the organization."""
    member = repo.get_member(org_id, user_id)
    if member is None or member.status != "active" or member.member_role not in _MANAGER_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to manage this organization.",
        )
