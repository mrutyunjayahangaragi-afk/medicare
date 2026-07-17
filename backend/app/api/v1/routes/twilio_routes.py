"""
app/api/v1/routes/twilio_routes.py
Twilio webhook endpoints.

POST /api/v1/twilio/status/message  — Twilio SMS status callback
POST /api/v1/twilio/status/call     — Twilio call status callback
GET  /api/v1/twilio/voice/emergency-message — TwiML for outbound call voice message
POST /api/v1/twilio/notify/{request_id}     — Trigger SMS/call for a request (auth required)

Security:
  - Status callbacks validate the Twilio request signature before processing.
  - The notify endpoint requires a valid user JWT; the backend loads the
    primary contact from the database — no phone number is accepted from
    the caller.
  - Rate-limit via FastAPI middleware is recommended for the callback endpoints.
"""

from __future__ import annotations

import logging
from typing import Annotated

from fastapi import APIRouter, Depends, Form, HTTPException, Request, status
from fastapi.responses import PlainTextResponse

from app.api.dependencies.auth import AuthContext, get_auth_context, get_current_user, CurrentUser
from app.db.supabase import get_supabase_admin_client
from app.schemas.common import APIResponse
from app.services.emergency_notification_service import EmergencyNotificationService

logger = logging.getLogger("medicare.routes.twilio")

router = APIRouter(tags=["Twilio"])

# ── TwiML voice message ────────────────────────────────────────────────

_TWIML_VOICE = """<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice" loop="2">
    This is an automated emergency alert from Medicare.
    Your emergency contact has requested urgent assistance.
    Please check your text message and contact them immediately.
  </Say>
</Response>"""


@router.get(
    "/voice/emergency-message",
    response_class=PlainTextResponse,
    summary="TwiML for outbound emergency call",
    include_in_schema=False,
)
async def emergency_voice_message() -> PlainTextResponse:
    """
    Returns TwiML that Twilio will execute for the outbound call.
    This endpoint must be publicly accessible (no auth) so Twilio can
    fetch it.  It never returns sensitive user data.
    """
    return PlainTextResponse(content=_TWIML_VOICE, media_type="text/xml")


# ── SMS status callback ────────────────────────────────────────────────

@router.post(
    "/status/message",
    response_class=PlainTextResponse,
    summary="Twilio SMS status callback",
    include_in_schema=False,
)
async def sms_status_callback(
    request: Request,
    MessageSid:    str = Form(default=""),
    MessageStatus: str = Form(default=""),
    To:            str = Form(default=""),
    From:          str = Form(default=""),
) -> PlainTextResponse:
    """
    Receive Twilio delivery status updates for outbound SMS.
    Validates the Twilio request signature before processing.
    """
    _verify_twilio_signature(request)

    if not MessageSid:
        return PlainTextResponse("", status_code=400)

    # Map Twilio status → our allowed values
    allowed = {"queued", "sent", "delivered", "failed", "undelivered"}
    norm_status = MessageStatus.lower() if MessageStatus.lower() in allowed else "failed"

    try:
        admin = get_supabase_admin_client()
        admin.table("contact_notifications").update({
            "status": norm_status,
        }).eq("provider_message_id", MessageSid).execute()
    except Exception as exc:
        logger.warning("SMS callback DB update failed sid=%s: %s", MessageSid, exc)

    return PlainTextResponse("", status_code=204)


# ── Call status callback ───────────────────────────────────────────────

@router.post(
    "/status/call",
    response_class=PlainTextResponse,
    summary="Twilio call status callback",
    include_in_schema=False,
)
async def call_status_callback(
    request: Request,
    CallSid:    str = Form(default=""),
    CallStatus: str = Form(default=""),
) -> PlainTextResponse:
    """
    Receive Twilio status updates for outbound calls.
    Validates the Twilio request signature before processing.
    """
    _verify_twilio_signature(request)

    if not CallSid:
        return PlainTextResponse("", status_code=400)

    allowed = {"queued", "ringing", "in-progress", "completed", "busy", "no-answer", "failed"}
    norm_status = CallStatus.lower() if CallStatus.lower() in allowed else "failed"

    try:
        admin = get_supabase_admin_client()
        admin.table("contact_notifications").update({
            "status": norm_status,
        }).eq("provider_message_id", CallSid).execute()
    except Exception as exc:
        logger.warning("Call callback DB update failed sid=%s: %s", CallSid, exc)

    return PlainTextResponse("", status_code=204)


# ── Notify endpoint (authenticated) ───────────────────────────────────

@router.post(
    "/notify/{request_id}",
    response_model=APIResponse,
    summary="Send emergency SMS/call to primary contact",
)
async def notify_primary_contact(
    request_id: str,
    auth: Annotated[AuthContext, Depends(get_auth_context)],
    send_sms:   bool = True,
    place_call: bool = False,
) -> APIResponse:
    """
    Trigger an SMS (and optionally a call) to the user's primary emergency
    contact for the given emergency request.

    The backend loads the contact from the database — no phone number is
    accepted from the client.
    """
    admin = get_supabase_admin_client()
    svc   = EmergencyNotificationService(admin)

    result = svc.notify_primary_contact(
        emergency_request_id=request_id,
        requesting_user_id=auth.user.id,
        send_sms=send_sms,
        place_call=place_call,
    )

    # Determine top-level success: at least one channel was attempted
    sms_ok  = result["sms"]["status"]  not in ("failed",)  if send_sms  else True
    call_ok = result["call"]["status"] not in ("failed",)  if place_call else True
    overall = sms_ok and call_ok

    return APIResponse(
        success=overall,
        message="Contact notification triggered." if overall else "Partial failure — check data field for details.",
        data=result,
    )


# ── Signature validation helper ────────────────────────────────────────

def _verify_twilio_signature(request: Request) -> None:
    """
    Validate the X-Twilio-Signature header.
    Raises HTTP 403 if validation fails.
    Skipped when TWILIO_ENABLED=false (development mode).
    """
    from app.core.config import get_settings

    settings = get_settings()
    if not getattr(settings, "twilio_enabled", False):
        return  # Skip validation in dev/when Twilio is disabled

    auth_token = getattr(settings, "twilio_auth_token", None)
    if not auth_token:
        raise HTTPException(status_code=503, detail="Twilio not configured.")

    signature = request.headers.get("X-Twilio-Signature", "")
    url = str(request.url)

    from app.services.twilio_service import TwilioService
    if not TwilioService.validate_signature(auth_token, signature, url, {}):
        logger.warning("Invalid Twilio signature from %s", request.client)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid Twilio signature.",
        )
