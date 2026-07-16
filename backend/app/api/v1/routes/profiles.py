"""
app/api/v1/routes/profiles.py
User profile API endpoints.

GET    /profile         — retrieve own profile
PUT    /profile         — replace all editable fields
PATCH  /profile         — partial update of editable fields

Protected fields (role, organization_id, responder_type, is_verified)
are never accepted through any of these endpoints.
"""

from __future__ import annotations

import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.dependencies.auth import AuthContext, CurrentUser, get_auth_context, get_current_user
from app.repositories.profiles import ProfileRepository
from app.schemas.common import APIResponse
from app.schemas.profile import ProfilePatchRequest, ProfileResponse, ProfileUpdateRequest
from app.services.profile_service import ProfileService

router = APIRouter()
logger = logging.getLogger("medicare.routes.profiles")


def _get_service() -> ProfileService:
    return ProfileService()


@router.get(
    "",
    response_model=APIResponse,
    summary="Get own profile",
    description=(
        "Returns the authenticated user's full profile. "
        "If the profile row has not been created yet, returns 404 with a safe message. "
        "Role and sensitive fields are included because the owner is reading their own data."
    ),
    responses={
        200: {"description": "Profile retrieved"},
        401: {"description": "Authentication required"},
        404: {"description": "Profile not found"},
    },
)
async def get_profile(
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    service: Annotated[ProfileService, Depends(_get_service)],
) -> APIResponse:
    """Return the authenticated user's profile."""
    profile = service.get_profile(current_user.id)
    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found. It may still be initialising.",
        )

    return APIResponse(
        success=True,
        message="Profile retrieved successfully.",
        data=ProfileResponse.model_validate(profile).model_dump(),
    )


@router.put(
    "",
    response_model=APIResponse,
    summary="Replace own profile",
    description=(
        "Replace all editable profile fields. "
        "Fields not included are set to null. "
        "Protected fields (role, organization_id, etc.) are rejected."
    ),
    responses={
        200: {"description": "Profile updated"},
        400: {"description": "Invalid request"},
        401: {"description": "Authentication required"},
        422: {"description": "Validation error"},
    },
)
async def update_profile(
    payload: ProfileUpdateRequest,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    service: Annotated[ProfileService, Depends(_get_service)],
) -> APIResponse:
    """Replace the authenticated user's editable profile fields."""
    updated = service.full_update(current_user.id, payload)
    if updated is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found. Cannot update a profile that does not exist.",
        )

    return APIResponse(
        success=True,
        message="Profile updated successfully.",
        data=ProfileResponse.model_validate(updated).model_dump(),
    )


@router.patch(
    "",
    response_model=APIResponse,
    summary="Partially update own profile",
    description=(
        "Update only the provided profile fields. "
        "Omitted fields retain their current values. "
        "Protected fields (role, organization_id, etc.) are rejected."
    ),
    responses={
        200: {"description": "Profile updated"},
        400: {"description": "Invalid request"},
        401: {"description": "Authentication required"},
        422: {"description": "Validation error"},
    },
)
async def patch_profile(
    payload: ProfilePatchRequest,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    service: Annotated[ProfileService, Depends(_get_service)],
) -> APIResponse:
    """Apply partial updates to the authenticated user's profile."""
    updated = service.partial_update(current_user.id, payload)
    if updated is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found.",
        )

    return APIResponse(
        success=True,
        message="Profile updated successfully.",
        data=ProfileResponse.model_validate(updated).model_dump(),
    )
