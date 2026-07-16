"""
app/api/v1/routes/assistant.py
AI Assistant endpoints (Gemini-backed).

GET    /config                       — feature flag + provider info (public)
POST   /chat                         — synchronous chat (requires auth)
POST   /chat/stream                  — SSE streaming chat (requires auth)
GET    /conversations                 — list user conversations (requires auth)
GET    /conversations/{id}           — conversation + messages (requires auth)
DELETE /conversations/{id}           — delete conversation (requires auth)
"""

from __future__ import annotations

import asyncio
import json as _json
import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse

from app.api.dependencies.auth import AuthContext, create_user_supabase_client, get_auth_context
from app.core.config import get_settings
from app.schemas.assistant import AssistantChatRequest, AssistantChatResponse
from app.services.assistant_service import AssistantService

router = APIRouter(tags=["Assistant"])
logger = logging.getLogger("medicare.routes.assistant")


@router.get("/config")
async def get_config() -> dict:
    """
    Return the assistant configuration.

    The frontend uses `enabled` to decide whether to show the assistant UI.
    Never exposes Gemini API key or any other secret.
    """
    settings = get_settings()
    return {
        "enabled": settings.ai_assistant_enabled,
        "provider": "gemini",
        "streaming": True,
        "max_input_characters": settings.ai_max_input_characters,
        "conversation_history_enabled": True,
        "disclaimer": (
            "This assistant provides general health information only. "
            "It does not diagnose disease, prescribe medication, or replace "
            "professional medical care. For emergencies call your local emergency services immediately."
        ),
    }


@router.post("/chat", response_model=AssistantChatResponse)
async def chat(
    request: AssistantChatRequest,
    auth: AuthContext = Depends(get_auth_context),
) -> AssistantChatResponse:
    """Synchronous chat. Prefer /chat/stream for a smoother UX."""
    settings = get_settings()
    if not settings.ai_assistant_enabled:
        raise HTTPException(status_code=503, detail="AI Assistant is currently disabled.")

    supabase = create_user_supabase_client(auth.access_token)
    service = AssistantService(supabase)
    return await service.chat(UUID(auth.user.id), request)


@router.post("/chat/stream")
async def chat_stream(
    request: AssistantChatRequest,
    auth: AuthContext = Depends(get_auth_context),
) -> StreamingResponse:
    """
    SSE streaming chat.

    Server-sent events:
      event: token    data: {"text":"..."}
      event: metadata data: {"conversation_id":"...","urgency":"...","show_sos":bool,...}
      event: done     data: {}
      event: error    data: {"message":"..."}

    Critical emergencies respond immediately without waiting for Gemini.
    """
    settings = get_settings()

    if not settings.ai_assistant_enabled:
        async def _disabled():
            yield 'event: error\ndata: {"message":"AI Assistant is currently disabled."}\n\n'

        return StreamingResponse(_disabled(), media_type="text/event-stream")

    supabase = create_user_supabase_client(auth.access_token)
    service = AssistantService(supabase)
    user_id = UUID(auth.user.id)

    async def _generate():
        try:
            async for chunk in service.stream_chat(user_id, request):
                yield chunk
                await asyncio.sleep(0)  # yield control so each chunk flushes immediately
        except HTTPException as exc:
            detail = exc.detail if isinstance(exc.detail, str) else "Assistant unavailable."
            yield f'event: error\ndata: {_json.dumps({"message": detail})}\n\n'
        except Exception:
            yield 'event: error\ndata: {"message":"AI Assistant is temporarily unavailable."}\n\n'

    return StreamingResponse(
        _generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  # disable nginx buffering for SSE
        },
    )


@router.get("/conversations")
async def list_conversations(
    auth: AuthContext = Depends(get_auth_context),
):
    """Return the authenticated user's conversation list (most recent first)."""
    supabase = create_user_supabase_client(auth.access_token)
    try:
        res = (
            supabase.table("ai_conversations")
            .select("id, title, created_at, updated_at")
            .order("updated_at", desc=True)
            .execute()
        )
        return res.data or []
    except Exception:
        return []


@router.get("/conversations/{conversation_id}")
async def get_conversation(
    conversation_id: UUID,
    auth: AuthContext = Depends(get_auth_context),
):
    """Return a single conversation with its messages."""
    supabase = create_user_supabase_client(auth.access_token)

    try:
        conv_res = (
            supabase.table("ai_conversations")
            .select("*")
            .eq("id", str(conversation_id))
            .execute()
        )
    except Exception:
        raise HTTPException(status_code=404, detail="Conversation not found.")

    if not conv_res.data:
        raise HTTPException(status_code=404, detail="Conversation not found.")

    try:
        msg_res = (
            supabase.table("ai_messages")
            .select("id, role, content, intent, urgency, created_at")
            .eq("conversation_id", str(conversation_id))
            .order("created_at", desc=False)
            .execute()
        )
        messages = msg_res.data or []
    except Exception:
        messages = []

    return {"conversation": conv_res.data[0], "messages": messages}


@router.delete("/conversations/{conversation_id}")
async def delete_conversation(
    conversation_id: UUID,
    auth: AuthContext = Depends(get_auth_context),
):
    """Delete a conversation and all its messages (RLS enforces ownership)."""
    supabase = create_user_supabase_client(auth.access_token)
    try:
        res = (
            supabase.table("ai_conversations")
            .delete()
            .eq("id", str(conversation_id))
            .execute()
        )
        if not res.data:
            raise HTTPException(status_code=404, detail="Conversation not found.")
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=404, detail="Conversation not found.")
    return {"status": "deleted"}
