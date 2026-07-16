import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException

from app.api.dependencies.auth import get_auth_context, AuthContext, create_user_supabase_client
from app.core.config import get_settings
from app.schemas.assistant import AssistantChatRequest, AssistantChatResponse
from app.services.assistant_service import AssistantService

router = APIRouter(tags=["assistant"])
logger = logging.getLogger(__name__)


@router.get("/config")
async def get_config() -> dict:
    settings = get_settings()
    return {
        "enabled": settings.ai_assistant_enabled,
        "max_input_characters": settings.ai_max_input_characters,
        "conversation_history_enabled": True,
        "disclaimer": "This assistant provides general information and does not replace professional medical care."
    }


@router.post("/chat", response_model=AssistantChatResponse)
async def chat(
    request: AssistantChatRequest,
    auth: AuthContext = Depends(get_auth_context)
):
    settings = get_settings()
    if not settings.ai_assistant_enabled:
        raise HTTPException(status_code=503, detail="AI Assistant is currently disabled.")

    supabase = create_user_supabase_client(auth.access_token)
    service = AssistantService(supabase)

    return await service.chat(UUID(auth.user.id), request)


@router.get("/conversations")
async def list_conversations(
    auth: AuthContext = Depends(get_auth_context),
):
    supabase = create_user_supabase_client(auth.access_token)
    try:
        res = supabase.table("ai_conversations") \
            .select("id, title, language, created_at, updated_at") \
            .order("updated_at", desc=True) \
            .execute()
        return res.data or []
    except Exception:
        # Table not yet created — return empty list instead of crashing
        return []


@router.get("/conversations/{conversation_id}")
async def get_conversation(
    conversation_id: UUID,
    auth: AuthContext = Depends(get_auth_context),
):
    supabase = create_user_supabase_client(auth.access_token)

    try:
        conv_res = supabase.table("ai_conversations") \
            .select("*") \
            .eq("id", str(conversation_id)) \
            .execute()
    except Exception:
        raise HTTPException(status_code=404, detail="Conversation not found")

    if not conv_res.data:
        raise HTTPException(status_code=404, detail="Conversation not found")

    try:
        msg_res = supabase.table("ai_messages") \
            .select("id, role, content, provider, intent, urgency, created_at") \
            .eq("conversation_id", str(conversation_id)) \
            .order("created_at", desc=False) \
            .execute()
        messages = msg_res.data or []
    except Exception:
        messages = []

    return {
        "conversation": conv_res.data[0],
        "messages": messages,
    }


@router.delete("/conversations/{conversation_id}")
async def delete_conversation(
    conversation_id: UUID,
    auth: AuthContext = Depends(get_auth_context),
):
    supabase = create_user_supabase_client(auth.access_token)
    try:
        res = supabase.table("ai_conversations") \
            .delete() \
            .eq("id", str(conversation_id)) \
            .execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Conversation not found")
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {"status": "deleted"}
