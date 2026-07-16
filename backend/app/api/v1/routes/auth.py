"""
app/api/v1/routes/auth.py
Authentication verification endpoints.

GET /auth/me — confirms the frontend and FastAPI auth are connected.
Returns safe user identity from the validated token + database profile.
Never returns access tokens, refresh tokens, or raw Supabase metadata.
"""

from __future__ import annotations

import logging
from typing import Annotated

from fastapi import APIRouter, Depends

from app.api.dependencies.auth import CurrentUser, get_current_user
from app.repositories.profiles import ProfileRepository
from app.schemas.auth import MeResponse
from app.schemas.common import APIResponse

router = APIRouter()
logger = logging.getLogger("medicare.routes.auth")


def _get_profile_repo() -> ProfileRepository:
    return ProfileRepository()


@router.get(
    "/me",
    response_model=APIResponse,
    summary="Get current authenticated user",
    description=(
        "Validates the Bearer token and returns the authenticated user's "
        "identity, role, and profile summary. "
        "Use this to confirm frontend ↔ FastAPI auth is working correctly. "
        "Never returns tokens, passwords, or raw metadata."
    ),
    responses={
        200: {"description": "Authenticated user identity"},
        401: {"description": "Missing or invalid token"},
    },
)
async def get_me(
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    repo: Annotated[ProfileRepository, Depends(_get_profile_repo)],
) -> APIResponse:
    """Return the current authenticated user's identity and profile summary."""
    profile = repo.get_by_id(current_user.id)

    me = MeResponse(
        id=current_user.id,
        email=current_user.email,
        role=profile.role.value if profile else "user",
        full_name=profile.full_name if profile else None,
        avatar_url=profile.avatar_url if profile else None,
    )

    logger.debug("GET /auth/me for user %s", current_user.id)
    return APIResponse(
        success=True,
        message="Authenticated user retrieved successfully.",
        data=me.model_dump(),
    )
