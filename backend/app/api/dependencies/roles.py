"""
app/api/dependencies/roles.py
Role-based access control dependencies.

Role data is always read from the database using the validated user ID,
never from the request body or any client-supplied value.
This prevents privilege escalation.
"""

from __future__ import annotations

import logging
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.concurrency import run_in_threadpool

from app.api.dependencies.auth import AuthContext, CurrentUser, get_auth_context, get_current_user
from app.repositories.profiles import ProfileRepository
from app.schemas.database.profile import UserRole

logger = logging.getLogger("medicare.roles")


def _get_profile_repo() -> ProfileRepository:
    return ProfileRepository()


async def require_responder(
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    repo: Annotated[ProfileRepository, Depends(_get_profile_repo)],
) -> CurrentUser:
    """Allow only users with a responder-class role.

    Accepted roles: responder, volunteer, hospital_staff, hospital
    Raises HTTP 403 for authenticated non-responder users.
    """
    profile = await run_in_threadpool(repo.get_by_id, current_user.id)
    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: responder role required.",
        )

    responder_roles = {
        UserRole.responder,
        UserRole.volunteer,
        UserRole.hospital_staff,
        UserRole.hospital,
    }
    if profile.role not in responder_roles:
        logger.info(
            "Access denied for user %s with role %s (responder required)",
            current_user.id,
            profile.role,
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: responder role required.",
        )

    return current_user


async def require_admin(
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    repo: Annotated[ProfileRepository, Depends(_get_profile_repo)],
) -> CurrentUser:
    """Allow only users with the admin role.

    Raises HTTP 403 for all non-admin authenticated users.
    """
    profile = await run_in_threadpool(repo.get_by_id, current_user.id)
    if profile is None or profile.role != UserRole.admin:
        logger.info(
            "Access denied for user %s (admin required)",
            current_user.id,
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: admin role required.",
        )

    return current_user


async def require_organization_member(
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    repo: Annotated[ProfileRepository, Depends(_get_profile_repo)],
) -> CurrentUser:
    """Allow only users who are members of an organization.

    Raises HTTP 403 if the user has no organization_id.
    """
    profile = await run_in_threadpool(repo.get_by_id, current_user.id)
    if profile is None or profile.organization_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: organization membership required.",
        )

    return current_user
