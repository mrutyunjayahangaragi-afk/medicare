"""
app/api/v1/routes/notifications.py
Notification API endpoints.

GET  /notifications               — list own notifications (paginated)
GET  /notifications/unread-count  — unread count
POST /notifications/{id}/read     — mark one as read (RPC)
POST /notifications/read-all      — mark all as read (RPC)
"""

from __future__ import annotations

import logging
from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.api.dependencies.auth import AuthContext, CurrentUser, get_auth_context, get_current_user
from app.api.dependencies.auth import create_user_supabase_client
from app.repositories.notifications import NotificationRepository
from app.schemas.common import APIResponse, PaginatedData
from app.utils.pagination import PaginationParams, get_pagination

router = APIRouter()
logger = logging.getLogger("medicare.routes.notifications")


def _get_repo() -> NotificationRepository:
    return NotificationRepository()


@router.get(
    "",
    response_model=APIResponse,
    summary="List notifications",
    description=(
        "Returns a paginated list of the authenticated user's notifications, newest first. "
        "Optionally filter by read status or notification type."
    ),
    responses={
        200: {"description": "Paginated notifications"},
        401: {"description": "Authentication required"},
    },
)
async def list_notifications(
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    repo: Annotated[NotificationRepository, Depends(_get_repo)],
    pagination: Annotated[PaginationParams, Depends(get_pagination)],
    is_read: bool | None = Query(default=None, description="Filter by read status"),
    notification_type: str | None = Query(default=None, alias="type"),
) -> APIResponse:
    items = repo.list_for_user(
        user_id=current_user.id,
        limit=pagination.limit,
        offset=pagination.offset,
        is_read=is_read,
        notification_type=notification_type,
    )
    total = repo.count_for_user(
        user_id=current_user.id,
        is_read=is_read,
        notification_type=notification_type,
    )

    paginated: PaginatedData[dict] = PaginatedData(
        items=[n.model_dump() for n in items],
        page=pagination.page,
        page_size=pagination.page_size,
        total=total,
        has_next=(pagination.offset + pagination.limit) < total,
    )

    return APIResponse(
        success=True,
        message="Notifications retrieved successfully.",
        data=paginated.model_dump(),
    )


@router.get(
    "/unread-count",
    response_model=APIResponse,
    summary="Get unread notification count",
    description="Returns the count of unread notifications for the authenticated user.",
    responses={
        200: {"description": "Unread count"},
        401: {"description": "Authentication required"},
    },
)
async def unread_count(
    auth_ctx: Annotated[AuthContext, Depends(get_auth_context)],
    repo: Annotated[NotificationRepository, Depends(_get_repo)],
) -> APIResponse:
    user_client = create_user_supabase_client(auth_ctx.access_token)
    count = repo.get_unread_count_via_rpc(user_client)
    return APIResponse(
        success=True,
        message="Unread notification count retrieved.",
        data={"unread_count": count},
    )


@router.post(
    "/read-all",
    response_model=APIResponse,
    summary="Mark all notifications as read",
    description="Mark all of the authenticated user's notifications as read via the secure RPC.",
    responses={
        200: {"description": "All marked as read"},
        401: {"description": "Authentication required"},
    },
)
async def mark_all_read(
    auth_ctx: Annotated[AuthContext, Depends(get_auth_context)],
    repo: Annotated[NotificationRepository, Depends(_get_repo)],
) -> APIResponse:
    user_client = create_user_supabase_client(auth_ctx.access_token)
    result = repo.mark_all_read_via_rpc(user_client)
    return APIResponse(
        success=True,
        message="All notifications marked as read.",
        data=result,
    )


@router.post(
    "/{notification_id}/read",
    response_model=APIResponse,
    summary="Mark one notification as read",
    description=(
        "Mark a single notification as read using the secure RPC. "
        "The RPC verifies the notification belongs to the authenticated user."
    ),
    responses={
        200: {"description": "Marked as read"},
        401: {"description": "Authentication required"},
        404: {"description": "Not found or not yours"},
    },
)
async def mark_notification_read(
    notification_id: str,
    auth_ctx: Annotated[AuthContext, Depends(get_auth_context)],
    repo: Annotated[NotificationRepository, Depends(_get_repo)],
) -> APIResponse:
    user_client = create_user_supabase_client(auth_ctx.access_token)
    result = repo.mark_read_via_rpc(notification_id, user_client)
    return APIResponse(
        success=True,
        message="Notification marked as read.",
        data=result,
    )
