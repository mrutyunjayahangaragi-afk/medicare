"""
app/api/v1/routes/messages.py
Request message API endpoints.

GET  /messages/conversations          — list conversation summaries
GET  /messages/{request_id}           — get conversation messages (RPC)
POST /messages/{request_id}           — send a message (RPC)
POST /messages/{request_id}/read      — mark messages as read (RPC)

Security:
  - All RPCs verify the caller is a valid participant.
  - recipient_id cannot be spoofed — the RPC derives it from the request.
"""

from __future__ import annotations

import logging
from typing import Annotated

from fastapi import APIRouter, Depends

from app.api.dependencies.auth import AuthContext, get_auth_context
from app.api.dependencies.auth import create_user_supabase_client
from app.repositories.messages import MessageRepository
from app.schemas.common import APIResponse
from app.schemas.message import SendMessageRequest
from app.services.message_service import MessageService

router = APIRouter()
logger = logging.getLogger("medicare.routes.messages")


def _get_service() -> MessageService:
    return MessageService()


def _get_repo() -> MessageRepository:
    return MessageRepository()


@router.get(
    "/conversations",
    response_model=APIResponse,
    summary="List conversations",
    description=(
        "Returns conversation summaries for all active requests where the "
        "authenticated user is the request owner or assigned responder."
    ),
    responses={
        200: {"description": "Conversation list"},
        401: {"description": "Authentication required"},
    },
)
async def list_conversations(
    auth_ctx: Annotated[AuthContext, Depends(get_auth_context)],
    repo: Annotated[MessageRepository, Depends(_get_repo)],
) -> APIResponse:
    conversations = repo.list_conversations_for_user(auth_ctx.user.id)
    return APIResponse(
        success=True,
        message="Conversations retrieved successfully.",
        data=[c.model_dump() for c in conversations],
    )


@router.get(
    "/{request_id}",
    response_model=APIResponse,
    summary="Get conversation messages",
    description=(
        "Returns all messages for a request conversation. "
        "The get_request_conversation RPC verifies the caller is a valid participant."
    ),
    responses={
        200: {"description": "Messages returned"},
        401: {"description": "Authentication required"},
        403: {"description": "Not a participant"},
        404: {"description": "Conversation not found"},
    },
)
async def get_conversation(
    request_id: str,
    auth_ctx: Annotated[AuthContext, Depends(get_auth_context)],
    service: Annotated[MessageService, Depends(_get_service)],
) -> APIResponse:
    user_client = create_user_supabase_client(auth_ctx.access_token)
    result = service.get_conversation(request_id, user_client)
    return APIResponse(
        success=True,
        message="Conversation retrieved successfully.",
        data=result,
    )


@router.post(
    "/{request_id}",
    response_model=APIResponse,
    status_code=201,
    summary="Send a message",
    description=(
        "Send a text message to a request conversation. "
        "Uses the send_request_message RPC which verifies participant access "
        "and creates the notification atomically. "
        "Message length: 1–1000 characters."
    ),
    responses={
        201: {"description": "Message sent"},
        400: {"description": "Validation error"},
        401: {"description": "Authentication required"},
        403: {"description": "Not a participant"},
    },
)
async def send_message(
    request_id: str,
    payload: SendMessageRequest,
    auth_ctx: Annotated[AuthContext, Depends(get_auth_context)],
    service: Annotated[MessageService, Depends(_get_service)],
) -> APIResponse:
    user_client = create_user_supabase_client(auth_ctx.access_token)
    result = service.send_message(request_id, payload.message, user_client)
    return APIResponse(
        success=True,
        message="Message sent successfully.",
        data=result,
    )


@router.post(
    "/{request_id}/read",
    response_model=APIResponse,
    summary="Mark messages as read",
    description=(
        "Mark all messages in this conversation addressed to the authenticated user as read. "
        "Does not mark the sender's own messages as read."
    ),
    responses={
        200: {"description": "Messages marked as read"},
        401: {"description": "Authentication required"},
    },
)
async def mark_read(
    request_id: str,
    auth_ctx: Annotated[AuthContext, Depends(get_auth_context)],
    service: Annotated[MessageService, Depends(_get_service)],
) -> APIResponse:
    user_client = create_user_supabase_client(auth_ctx.access_token)
    result = service.mark_messages_read(request_id, user_client)
    return APIResponse(
        success=True,
        message="Messages marked as read.",
        data=result,
    )
