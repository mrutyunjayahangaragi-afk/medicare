"""
app/services/assistant_service.py
Business logic for the AI Assistant (Gemini-backed).

Flow
----
1. Rate-limit check
2. Input validation (length + safety pre-filter)
3. If immediate risk → return deterministic critical response, skip Gemini
4. Get or create conversation row
5. Store user message
6. Build conversation history + system prompt
7. Call Gemini via get_ai_provider()
8. Store assistant message + record usage
9. Return structured AssistantChatResponse

Security
--------
- user_id is always taken from the validated JWT, never from the request body.
- Message content is never logged.
- Provider errors are wrapped — raw Gemini errors never reach the API response.
- Database failures are non-fatal for history/usage but do not silently swallow
  the response.
"""

from __future__ import annotations

import json as _json
import logging
import uuid
from datetime import datetime, timedelta, timezone
from typing import AsyncIterator
from uuid import UUID

from fastapi import HTTPException
from supabase import Client

from app.ai.exceptions import OutputParsingError, ProviderUnavailableError, SafetyPolicyViolationError
from app.ai.output_parser import get_parsing_fallback
from app.ai.prompts import SYSTEM_INSTRUCTION
from app.ai.safety import assess_safety, get_critical_fallback
from app.core.config import get_settings
from app.db.supabase import get_supabase_admin_client
from app.schemas.assistant import (
    AssistantChatRequest,
    AssistantChatResponse,
    AssistantGenerationRequest,
    AssistantGenerationResult,
)

logger = logging.getLogger("medicare.services.assistant")


class AssistantService:
    def __init__(self, supabase: Client) -> None:
        self.supabase = supabase                    # user-scoped (RLS via auth.uid())
        self.admin = get_supabase_admin_client()    # service-role for server-authored rows
        self.settings = get_settings()
        # Provider resolved lazily — missing key → 503, not startup crash
        self._provider = None

    # ── Provider ─────────────────────────────────────────────────────────

    def _get_provider(self):
        if self._provider is None:
            from app.ai.provider_factory import get_ai_provider
            self._provider = get_ai_provider()
        return self._provider

    # ── Rate limiting ─────────────────────────────────────────────────────

    async def check_rate_limits(self, user_id: UUID) -> None:
        try:
            now = datetime.now(timezone.utc)
            one_min_ago = (now - timedelta(minutes=1)).isoformat()
            one_day_ago = (now - timedelta(days=1)).isoformat()

            res_min = (
                self.supabase.table("ai_usage")
                .select("id", count="exact")
                .eq("user_id", str(user_id))
                .gte("created_at", one_min_ago)
                .execute()
            )
            count_min = res_min.count if res_min.count is not None else len(res_min.data)
            if count_min >= self.settings.ai_rate_limit_per_minute:
                raise HTTPException(status_code=429, detail="Too many requests. Please wait a moment.")

            res_day = (
                self.supabase.table("ai_usage")
                .select("id", count="exact")
                .eq("user_id", str(user_id))
                .gte("created_at", one_day_ago)
                .execute()
            )
            count_day = res_day.count if res_day.count is not None else len(res_day.data)
            if count_day >= self.settings.ai_rate_limit_per_day:
                raise HTTPException(status_code=429, detail="Daily message limit reached. Try again tomorrow.")
        except HTTPException:
            raise
        except Exception:
            # ai_usage table may not exist yet — skip gracefully
            pass

    # ── Conversation management ───────────────────────────────────────────

    def _get_or_create_conversation(
        self,
        user_id: UUID,
        conversation_id: UUID | None,
        request_id: UUID | None,
    ) -> UUID:
        if conversation_id:
            try:
                res = (
                    self.supabase.table("ai_conversations")
                    .select("id")
                    .eq("id", str(conversation_id))
                    .eq("user_id", str(user_id))
                    .execute()
                )
                if res.data:
                    return conversation_id
                raise HTTPException(status_code=404, detail="Conversation not found.")
            except HTTPException:
                raise
            except Exception:
                # Table not yet created — fall through to create a new one
                pass

        data: dict = {"user_id": str(user_id), "title": "New Conversation"}
        if request_id:
            req_res = (
                self.supabase.table("emergency_requests")
                .select("id")
                .eq("id", str(request_id))
                .eq("user_id", str(user_id))
                .execute()
            )
            if not req_res.data:
                raise HTTPException(status_code=403, detail="Unauthorized request context.")
            data["related_request_id"] = str(request_id)

        try:
            new_conv = self.supabase.table("ai_conversations").insert(data).execute()
            return UUID(new_conv.data[0]["id"])
        except Exception as exc:
            raise HTTPException(
                status_code=503,
                detail="Conversation storage is not yet configured. Run the database migration.",
            ) from exc

    def _get_conversation_history(self, conversation_id: UUID) -> list[dict[str, str]]:
        try:
            res = (
                self.supabase.table("ai_messages")
                .select("role, content")
                .eq("conversation_id", str(conversation_id))
                .order("created_at", desc=True)
                .limit(self.settings.ai_max_history_messages)
                .execute()
            )
        except Exception:
            return []

        history = []
        for msg in reversed(res.data or []):
            if msg["role"] in ("user", "assistant"):
                history.append({"role": msg["role"], "content": msg["content"]})
        return history

    def _get_request_context(self, request_id: UUID, user_id: UUID) -> str:
        try:
            res = (
                self.supabase.table("emergency_requests")
                .select("emergency_type, severity, status, manual_address")
                .eq("id", str(request_id))
                .eq("user_id", str(user_id))
                .execute()
            )
            if not res.data:
                return ""
            req = res.data[0]
            return (
                f"[Emergency Context]\n"
                f"Type: {req['emergency_type']}\n"
                f"Severity: {req['severity']}\n"
                f"Status: {req['status']}\n"
                f"Location: {req.get('manual_address') or 'Unknown'}\n"
            )
        except Exception:
            return ""

    # ── Persistence ───────────────────────────────────────────────────────

    def _store_user_message(
        self, user_id: UUID, conv_id: UUID, message: str, safety_category: str
    ) -> None:
        try:
            self.supabase.table("ai_messages").insert({
                "conversation_id": str(conv_id),
                "user_id": str(user_id),
                "role": "user",
                "content": message,
                "safety_category": safety_category,
            }).execute()
        except Exception:
            pass  # Non-fatal

    def _store_assistant_message(
        self, user_id: UUID, conv_id: UUID, result: AssistantGenerationResult
    ) -> UUID:
        msg_id = uuid.uuid4()
        try:
            msg_res = self.supabase.table("ai_messages").insert({
                "conversation_id": str(conv_id),
                "user_id": str(user_id),
                "role": "assistant",
                "content": result.structured_response.answer,
                "provider": result.provider,
                "model": result.model,
                "intent": result.structured_response.intent.value,
                "urgency": result.structured_response.urgency.value,
                "safety_category": "safe",
            }).execute()
            msg_id = UUID(msg_res.data[0]["id"])
        except Exception:
            pass  # Non-fatal — msg_id stays as the generated UUID
        return msg_id

    def _update_conversation_title(self, conv_id: UUID, message: str) -> None:
        """Set a readable title from the first user message (truncated)."""
        try:
            title = message[:60].strip()
            if len(message) > 60:
                title += "…"
            self.supabase.table("ai_conversations").update({"title": title}).eq(
                "id", str(conv_id)
            ).execute()
        except Exception:
            pass  # Non-fatal

    def _record_usage(
        self,
        user_id: UUID,
        provider: str,
        model: str | None,
        in_chars: int,
        out_chars: int,
        status: str,
        latency: int,
    ) -> None:
        try:
            self.supabase.table("ai_usage").insert({
                "user_id": str(user_id),
                "provider": provider,
                "model": model,
                "request_characters": in_chars,
                "response_characters": out_chars,
                "status": status,
                "latency_ms": latency,
            }).execute()
        except Exception:
            pass  # Non-fatal

    # ── Core chat ─────────────────────────────────────────────────────────

    async def chat(self, user_id: UUID, req: AssistantChatRequest) -> AssistantChatResponse:
        """
        Synchronous (non-streaming) chat.  Used by POST /assistant/chat.
        """
        await self.check_rate_limits(user_id)

        # 1. Input length check
        if len(req.message) > self.settings.ai_max_input_characters:
            raise HTTPException(status_code=400, detail="Message too long.")

        # 2. Deterministic safety pre-filter
        safety = assess_safety(req.message)
        if safety.prompt_injection_detected or safety.prohibited_medical_request:
            raise HTTPException(
                status_code=400,
                detail="Request cannot be processed due to safety constraints.",
            )

        # 3. Conversation
        conv_id = self._get_or_create_conversation(user_id, req.conversation_id, req.request_id)
        is_new_conversation = req.conversation_id is None

        # 4. Store user message
        self._store_user_message(user_id, conv_id, req.message, safety.category)
        if is_new_conversation:
            self._update_conversation_title(conv_id, req.message)

        # 5. Critical shortcut — no Gemini call needed
        if safety.immediate_risk:
            result = AssistantGenerationResult(
                provider="deterministic",
                model=None,
                structured_response=get_critical_fallback(),
                input_characters=len(req.message),
                output_characters=200,
                latency_ms=10,
            )
            return self._finalize(user_id, conv_id, result, "success")

        # 6. Build history + system prompt
        history = self._get_conversation_history(conv_id)
        # Ensure the current user message is included
        if not history or history[-1].get("content") != req.message or history[-1].get("role") != "user":
            history.append({"role": "user", "content": req.message})

        context_str = ""
        if req.include_request_context and req.request_id:
            context_str = self._get_request_context(req.request_id, user_id)

        system_prompt = (
            f"{SYSTEM_INSTRUCTION}\n\n{context_str}" if context_str else SYSTEM_INSTRUCTION
        )

        gen_req = AssistantGenerationRequest(
            system_instruction=system_prompt,
            messages=history,
            timeout=self.settings.ai_request_timeout_seconds,
            temperature=self.settings.ai_temperature,
        )

        # 7. Call Gemini (lazy provider resolution)
        try:
            provider = self._get_provider()
        except ProviderUnavailableError as exc:
            logger.warning("Gemini provider unavailable: %s", exc)
            result = AssistantGenerationResult(
                provider="fallback",
                model=None,
                structured_response=get_parsing_fallback(),
                input_characters=len(req.message),
                output_characters=100,
                latency_ms=0,
            )
            return self._finalize(user_id, conv_id, result, "provider_unavailable")

        try:
            result = await provider.generate(gen_req)
            status = "success"
        except SafetyPolicyViolationError:
            self._record_usage(user_id, "gemini", None, len(req.message), 0, "safety_blocked", 0)
            raise HTTPException(status_code=400, detail="Request blocked by content safety filters.")
        except (ProviderUnavailableError, OutputParsingError):
            result = AssistantGenerationResult(
                provider="fallback",
                model=None,
                structured_response=get_parsing_fallback(),
                input_characters=len(req.message),
                output_characters=100,
                latency_ms=0,
            )
            status = "fallback"

        return self._finalize(user_id, conv_id, result, status)

    def _finalize(
        self,
        user_id: UUID,
        conv_id: UUID,
        result: AssistantGenerationResult,
        status: str,
    ) -> AssistantChatResponse:
        msg_id = self._store_assistant_message(user_id, conv_id, result)
        self._record_usage(
            user_id,
            result.provider,
            result.model,
            result.input_characters,
            result.output_characters,
            status,
            result.latency_ms,
        )
        return AssistantChatResponse(
            conversation_id=conv_id,
            message_id=msg_id,
            provider=result.provider,
            model=result.model,
            intent=result.structured_response.intent,
            urgency=result.structured_response.urgency,
            answer=result.structured_response.answer,
            actions=result.structured_response.actions,
            suggested_route=result.structured_response.suggested_route,
            should_show_sos=result.structured_response.should_show_sos,
            needs_professional_help=result.structured_response.needs_professional_help,
            disclaimer=result.structured_response.disclaimer,
            created_at=datetime.now(timezone.utc),
        )

    # ── Streaming chat ────────────────────────────────────────────────────

    async def stream_chat(
        self, user_id: UUID, req: AssistantChatRequest
    ) -> AsyncIterator[str]:
        """
        Yield SSE-formatted text chunks for POST /assistant/chat/stream.

        Event types:
          token    — {"text": "..."}
          metadata — {"conversation_id":"...","urgency":"...","show_sos":bool,...}
          done     — {}
          error    — {"message":"..."}

        Critical emergencies emit immediately without waiting for Gemini.
        """
        await self.check_rate_limits(user_id)

        if len(req.message) > self.settings.ai_max_input_characters:
            yield f'event: error\ndata: {_json.dumps({"message": "Message too long."})}\n\n'
            return

        safety = assess_safety(req.message)

        # ── Prompt injection / prohibited medical ──────────────────────────
        if safety.prompt_injection_detected or safety.prohibited_medical_request:
            yield (
                f'event: error\ndata: {_json.dumps({"message": "Request cannot be processed due to safety constraints."})}\n\n'
            )
            return

        # ── Critical emergency shortcut ────────────────────────────────────
        if safety.immediate_risk:
            conv_id = self._get_or_create_conversation(user_id, req.conversation_id, req.request_id)
            self._store_user_message(user_id, conv_id, req.message, "immediate_risk")
            resp = get_critical_fallback()
            result = AssistantGenerationResult(
                provider="deterministic",
                model=None,
                structured_response=resp,
                input_characters=len(req.message),
                output_characters=len(resp.answer),
                latency_ms=10,
            )
            self._finalize(user_id, conv_id, result, "success")

            yield f'event: token\ndata: {_json.dumps({"text": resp.answer})}\n\n'
            yield f'event: metadata\ndata: {_json.dumps({"urgency": resp.urgency.value, "intent": resp.intent.value, "show_sos": resp.should_show_sos, "suggested_route": resp.suggested_route, "actions": resp.actions, "conversation_id": str(conv_id)})}\n\n'
            yield "event: done\ndata: {}\n\n"
            return

        # ── Normal path: call Gemini, stream words back ───────────────────
        try:
            full_response = await self.chat(user_id, req)
        except HTTPException as exc:
            msg = exc.detail if isinstance(exc.detail, str) else "Assistant unavailable."
            yield f'event: error\ndata: {_json.dumps({"message": msg})}\n\n'
            return
        except Exception:
            yield 'event: error\ndata: {"message":"AI Assistant is temporarily unavailable."}\n\n'
            return

        # Emit word-by-word for a smooth typing effect
        words = full_response.answer.split()
        chunk: list[str] = []
        for word in words:
            chunk.append(word)
            if len(" ".join(chunk)) >= 60:
                text = " ".join(chunk) + " "
                yield f'event: token\ndata: {_json.dumps({"text": text})}\n\n'
                chunk = []
        if chunk:
            yield f'event: token\ndata: {_json.dumps({"text": " ".join(chunk)})}\n\n'

        # Metadata event
        meta = {
            "conversation_id": str(full_response.conversation_id),
            "message_id": str(full_response.message_id),
            "urgency": full_response.urgency.value,
            "intent": full_response.intent.value,
            "show_sos": full_response.should_show_sos,
            "suggested_route": full_response.suggested_route,
            "actions": full_response.actions,
        }
        yield f'event: metadata\ndata: {_json.dumps(meta)}\n\n'
        yield "event: done\ndata: {}\n\n"
