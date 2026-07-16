"""
app/api/v1/routes/emergency_contacts.py
Emergency contact API endpoints.

POST   /emergency-contacts                              — create
GET    /emergency-contacts                              — list own contacts
GET    /emergency-contacts/{contact_id}                 — get one
PUT    /emergency-contacts/{contact_id}                 — full update
PATCH  /emergency-contacts/{contact_id}                 — partial update
DELETE /emergency-contacts/{contact_id}                 — delete
POST   /emergency-contacts/{contact_id}/primary         — set as primary (RPC)
"""

from __future__ import annotations

import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.dependencies.auth import AuthContext, CurrentUser, get_auth_context, get_current_user
from app.api.dependencies.auth import create_user_supabase_client
from app.repositories.emergency_contacts import EmergencyContactRepository
from app.schemas.common import APIResponse
from app.schemas.emergency_contact import (
    EmergencyContactCreate,
    EmergencyContactPatch,
    EmergencyContactResponse,
    EmergencyContactUpdate,
)
from app.services.emergency_contact_service import EmergencyContactService

router = APIRouter()
logger = logging.getLogger("medicare.routes.emergency_contacts")


def _get_service() -> EmergencyContactService:
    return EmergencyContactService()


def _get_repo() -> EmergencyContactRepository:
    return EmergencyContactRepository()


@router.get(
    "",
    response_model=APIResponse,
    summary="List emergency contacts",
    description="Returns all emergency contacts for the authenticated user, primary contact first.",
    responses={
        200: {"description": "Contacts list"},
        401: {"description": "Authentication required"},
    },
)
async def list_contacts(
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    repo: Annotated[EmergencyContactRepository, Depends(_get_repo)],
) -> APIResponse:
    contacts = repo.list_for_user(current_user.id)
    return APIResponse(
        success=True,
        message="Emergency contacts retrieved successfully.",
        data=[c.model_dump() for c in contacts],
    )


@router.post(
    "",
    response_model=APIResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create emergency contact",
    description=(
        "Add a new emergency contact. user_id is always set from the token. "
        "Duplicate phone numbers per user return 409."
    ),
    responses={
        201: {"description": "Contact created"},
        400: {"description": "Validation error"},
        401: {"description": "Authentication required"},
        409: {"description": "Duplicate phone number"},
        422: {"description": "Validation error"},
    },
)
async def create_contact(
    payload: EmergencyContactCreate,
    auth_ctx: Annotated[AuthContext, Depends(get_auth_context)],
    service: Annotated[EmergencyContactService, Depends(_get_service)],
) -> APIResponse:
    user_client = create_user_supabase_client(auth_ctx.access_token)
    contact = service.create_contact(auth_ctx.user.id, payload, user_client)
    return APIResponse(
        success=True,
        message="Emergency contact created successfully.",
        data=contact.model_dump(),
    )


@router.get(
    "/{contact_id}",
    response_model=APIResponse,
    summary="Get one emergency contact",
    description="Returns a single emergency contact owned by the authenticated user.",
    responses={
        200: {"description": "Contact found"},
        401: {"description": "Authentication required"},
        404: {"description": "Not found"},
    },
)
async def get_contact(
    contact_id: str,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    repo: Annotated[EmergencyContactRepository, Depends(_get_repo)],
) -> APIResponse:
    contact = repo.get_by_id(contact_id, current_user.id)
    if contact is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Emergency contact not found.",
        )
    return APIResponse(
        success=True,
        message="Emergency contact retrieved successfully.",
        data=contact.model_dump(),
    )


@router.put(
    "/{contact_id}",
    response_model=APIResponse,
    summary="Replace an emergency contact",
    description="Replace all fields of an emergency contact owned by the authenticated user.",
    responses={
        200: {"description": "Contact updated"},
        401: {"description": "Authentication required"},
        404: {"description": "Not found"},
        409: {"description": "Duplicate phone number"},
    },
)
async def update_contact(
    contact_id: str,
    payload: EmergencyContactUpdate,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    repo: Annotated[EmergencyContactRepository, Depends(_get_repo)],
) -> APIResponse:
    # Verify ownership first
    existing = repo.get_by_id(contact_id, current_user.id)
    if existing is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Emergency contact not found.",
        )

    # Duplicate phone check (excluding this contact)
    if repo.phone_exists_for_user(payload.phone_number, current_user.id, exclude_id=contact_id):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A contact with this phone number already exists.",
        )

    updated = repo.update(contact_id, current_user.id, payload)
    if updated is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Emergency contact not found.",
        )

    return APIResponse(
        success=True,
        message="Emergency contact updated successfully.",
        data=updated.model_dump(),
    )


@router.patch(
    "/{contact_id}",
    response_model=APIResponse,
    summary="Partially update an emergency contact",
    description="Update only the provided fields of an emergency contact owned by the authenticated user.",
    responses={
        200: {"description": "Contact updated"},
        401: {"description": "Authentication required"},
        404: {"description": "Not found"},
        409: {"description": "Duplicate phone number"},
    },
)
async def patch_contact(
    contact_id: str,
    payload: EmergencyContactPatch,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    repo: Annotated[EmergencyContactRepository, Depends(_get_repo)],
) -> APIResponse:
    existing = repo.get_by_id(contact_id, current_user.id)
    if existing is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Emergency contact not found.",
        )

    if payload.phone_number and repo.phone_exists_for_user(
        payload.phone_number, current_user.id, exclude_id=contact_id
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A contact with this phone number already exists.",
        )

    updated = repo.patch(contact_id, current_user.id, payload)
    if updated is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Emergency contact not found.",
        )

    return APIResponse(
        success=True,
        message="Emergency contact updated successfully.",
        data=updated.model_dump(),
    )


@router.delete(
    "/{contact_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete an emergency contact",
    description="Delete an emergency contact owned by the authenticated user.",
    responses={
        204: {"description": "Deleted"},
        401: {"description": "Authentication required"},
        404: {"description": "Not found"},
    },
)
async def delete_contact(
    contact_id: str,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    repo: Annotated[EmergencyContactRepository, Depends(_get_repo)],
) -> None:
    existing = repo.get_by_id(contact_id, current_user.id)
    if existing is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Emergency contact not found.",
        )
    repo.delete(contact_id, current_user.id)


@router.post(
    "/{contact_id}/primary",
    response_model=APIResponse,
    summary="Set contact as primary",
    description=(
        "Atomically set this contact as the user's primary emergency contact. "
        "Uses the set_primary_emergency_contact RPC to ensure only one primary exists."
    ),
    responses={
        200: {"description": "Primary contact set"},
        401: {"description": "Authentication required"},
        404: {"description": "Not found"},
    },
)
async def set_primary_contact(
    contact_id: str,
    auth_ctx: Annotated[AuthContext, Depends(get_auth_context)],
    service: Annotated[EmergencyContactService, Depends(_get_service)],
) -> APIResponse:
    user_client = create_user_supabase_client(auth_ctx.access_token)
    result = service.set_primary_contact(contact_id, auth_ctx.user.id, user_client)
    return APIResponse(
        success=True,
        message="Primary emergency contact set successfully.",
        data=result,
    )
