"""
app/services/emergency_notification_service.py
Orchestrates emergency contact alerts (SMS + optional call) after an
emergency request is created.

Security rules:
  - The primary contact phone number is loaded from the database by
    the backend.  No phone number is ever accepted from the frontend.
  - The requesting user must own the emergency request.
  - Phone numbers are never logged in full (masked to last 4 digits).
  - If Twilio is disabled or not configured, the function returns a
    non-fatal result — the SOS request is always preserved.
  - Idempotency: the contact_notifications table has a unique constraint
    on (emergency_request_id, channel, notification_type). Duplicate
    calls are detected and skipped.
"""

from __future__ import annotations

import logging
import re
from typing import Any
from uuid import UUID

from supabase import Client

logger = logging.getLogger("medicare.services.emergency_notifications")

# E.164 validation — allows digits, spaces, dashes, parentheses after '+'
_E164_RE = re.compile(r"^\+[1-9]\d{6,14}$")


def _validate_e164(phone: str) -> str | None:
    """Return the phone number if valid E.164, else None."""
    cleaned = re.sub(r"[\s\-\(\)]", "", phone.strip())
    return cleaned if _E164_RE.match(cleaned) else None


def _mask(phone: str) -> str:
    return "****" + phone[-4:] if len(phone) >= 4 else "****"


class EmergencyNotificationService:
    """
    Orchestrates SMS and optional phone-call alerts to the user's
    primary emergency contact after an SOS request is created.
    """

    def __init__(self, admin_client: Client) -> None:
        """
        admin_client: service-role Supabase client (bypasses RLS so the
        backend can read any user's primary contact and write delivery
        records without requiring a user JWT).
        """
        self.db = admin_client

    # ── Public API ────────────────────────────────────────────────────

    def notify_primary_contact(
        self,
        emergency_request_id: str | UUID,
        requesting_user_id: str | UUID,
        send_sms: bool = True,
        place_call: bool = False,
    ) -> dict[str, Any]:
        """
        Send alerts to the primary emergency contact.

        Returns:
          {
            "request_id": str,
            "sms":  {"requested": bool, "status": str, "provider_id": str|None, "error": str|None},
            "call": {"requested": bool, "status": str, "provider_id": str|None, "error": str|None},
          }

        Never raises — all failures are captured in the return value so the
        caller (emergency request creation) can still succeed.
        """
        req_id  = str(emergency_request_id)
        user_id = str(requesting_user_id)

        sms_result:  dict[str, Any] = {"requested": send_sms,  "status": "skipped", "provider_id": None, "error": None}
        call_result: dict[str, Any] = {"requested": place_call, "status": "skipped", "provider_id": None, "error": None}

        if not send_sms and not place_call:
            return {"request_id": req_id, "sms": sms_result, "call": call_result}

        # ── Load the emergency request ────────────────────────────────
        try:
            req_res = (
                self.db.table("emergency_requests")
                .select("id, user_id, emergency_type, severity, latitude, longitude, manual_address")
                .eq("id", req_id)
                .single()
                .execute()
            )
            request = req_res.data
        except Exception as exc:
            logger.error("Could not load emergency request %s: %s", req_id, exc)
            sms_result["error"] = call_result["error"] = "Emergency request not found."
            return {"request_id": req_id, "sms": sms_result, "call": call_result}

        # ── Ownership check ───────────────────────────────────────────
        if request.get("user_id") != user_id:
            logger.warning("Ownership mismatch request=%s user=%s", req_id, user_id[:8])
            sms_result["error"] = call_result["error"] = "Unauthorized."
            return {"request_id": req_id, "sms": sms_result, "call": call_result}

        # ── Load primary emergency contact ────────────────────────────
        try:
            contact_res = (
                self.db.table("emergency_contacts")
                .select("id, full_name, phone_number, notify_during_emergency")
                .eq("user_id", user_id)
                .eq("is_primary", True)
                .single()
                .execute()
            )
            contact = contact_res.data
        except Exception:
            contact = None

        if not contact:
            msg = "No primary emergency contact set. Please add one in Settings → Emergency Contacts."
            sms_result["error"] = call_result["error"] = msg
            logger.info("No primary contact for user=%s", user_id[:8])
            return {"request_id": req_id, "sms": sms_result, "call": call_result}

        if not contact.get("notify_during_emergency", True):
            msg = "Primary contact has notifications disabled."
            sms_result["error"] = call_result["error"] = msg
            return {"request_id": req_id, "sms": sms_result, "call": call_result}

        # ── Validate phone number ────────────────────────────────────
        raw_phone = contact.get("phone_number", "")
        phone = _validate_e164(raw_phone)
        if not phone:
            msg = f"Primary contact phone number is not in E.164 format ({_mask(raw_phone)})."
            sms_result["error"] = call_result["error"] = msg
            logger.warning("Invalid phone for contact=%s", contact.get("id"))
            return {"request_id": req_id, "sms": sms_result, "call": call_result}

        # ── Load requester name ───────────────────────────────────────
        try:
            profile_res = (
                self.db.table("profiles")
                .select("full_name")
                .eq("id", user_id)
                .single()
                .execute()
            )
            user_name = profile_res.data.get("full_name") or "Someone"
        except Exception:
            user_name = "Someone"

        # ── Build SMS body ────────────────────────────────────────────
        etype    = request.get("emergency_type", "emergency").replace("_", " ")
        severity = request.get("severity", "unknown")
        short_id = req_id[-8:].upper()

        location_text = ""
        lat = request.get("latitude")
        lon = request.get("longitude")
        if lat and lon:
            maps_url = f"https://maps.google.com/?q={lat},{lon}"
            location_text = f" Location: {maps_url}."
        elif request.get("manual_address"):
            location_text = f" Location: {request['manual_address']}."

        sms_body = (
            f"EMERGENCY ALERT from Medicare: {user_name} has requested help "
            f"({etype}, {severity} severity).{location_text} "
            f"Ref: #{short_id}. Please contact them immediately."
        )

        # ── SMS ───────────────────────────────────────────────────────
        if send_sms:
            sms_result = self._send_sms(
                req_id=req_id,
                contact_id=contact["id"],
                phone=phone,
                body=sms_body,
            )

        # ── Optional call ─────────────────────────────────────────────
        if place_call:
            call_result = self._place_call(
                req_id=req_id,
                contact_id=contact["id"],
                phone=phone,
            )

        return {"request_id": req_id, "sms": sms_result, "call": call_result}

    # ── Private: SMS ──────────────────────────────────────────────────

    def _send_sms(
        self,
        req_id: str,
        contact_id: str,
        phone: str,
        body: str,
    ) -> dict[str, Any]:
        # Idempotency: check for an existing record
        existing = self._get_existing_record(req_id, "sms")
        if existing:
            logger.debug("SMS already sent for request=%s, skipping.", req_id[-8:])
            return {
                "requested":   True,
                "status":      existing.get("status", "sent"),
                "provider_id": existing.get("provider_message_id"),
                "error":       None,
            }

        # Persist a 'queued' record first (idempotency guard)
        record_id = self._upsert_notification_record(req_id, contact_id, "sms", "queued")

        from app.services.twilio_service import TwilioService, TwilioServiceError
        from app.core.config import get_settings
        settings = get_settings()

        cb_url: str | None = getattr(settings, "twilio_status_callback_url", None)

        try:
            svc = TwilioService()
            result = svc.send_sms(
                to_number=phone,
                body=body,
                status_callback_url=cb_url,
            )
            provider_id = result.get("sid")
            status      = result.get("status", "sent")
            error       = result.get("error_message")

            self._update_notification_record(record_id, status, provider_id, error)
            return {"requested": True, "status": status, "provider_id": provider_id, "error": error}

        except TwilioServiceError as exc:
            msg = str(exc)
            logger.warning("SMS failed request=%s error=%s", req_id[-8:], msg[:200])
            self._update_notification_record(record_id, "failed", None, msg[:500])
            return {"requested": True, "status": "failed", "provider_id": None, "error": msg}

    # ── Private: Call ─────────────────────────────────────────────────

    def _place_call(
        self,
        req_id: str,
        contact_id: str,
        phone: str,
    ) -> dict[str, Any]:
        existing = self._get_existing_record(req_id, "call")
        if existing:
            return {
                "requested":   True,
                "status":      existing.get("status", "queued"),
                "provider_id": existing.get("provider_message_id"),
                "error":       None,
            }

        record_id = self._upsert_notification_record(req_id, contact_id, "call", "queued")

        from app.services.twilio_service import TwilioService, TwilioServiceError
        from app.core.config import get_settings
        settings = get_settings()

        twiml_url = getattr(settings, "twilio_call_twiml_url", None)
        cb_url    = getattr(settings, "twilio_status_callback_url", None)

        if not twiml_url:
            msg = "TWILIO_CALL_TWIML_URL is not configured."
            self._update_notification_record(record_id, "failed", None, msg)
            return {"requested": True, "status": "failed", "provider_id": None, "error": msg}

        try:
            svc = TwilioService()
            result = svc.place_call(
                to_number=phone,
                twiml_url=twiml_url,
                status_callback_url=cb_url,
            )
            provider_id = result.get("sid")
            status      = result.get("status", "queued")
            self._update_notification_record(record_id, status, provider_id, None)
            return {"requested": True, "status": status, "provider_id": provider_id, "error": None}

        except TwilioServiceError as exc:
            msg = str(exc)
            self._update_notification_record(record_id, "failed", None, msg[:500])
            return {"requested": True, "status": "failed", "provider_id": None, "error": msg}

    # ── DB helpers ────────────────────────────────────────────────────

    def _get_existing_record(self, req_id: str, channel: str) -> dict | None:
        try:
            res = (
                self.db.table("contact_notifications")
                .select("id, status, provider_message_id")
                .eq("emergency_request_id", req_id)
                .eq("channel", channel)
                .eq("notification_type", "sos_alert")
                .limit(1)
                .execute()
            )
            return res.data[0] if res.data else None
        except Exception:
            return None

    def _upsert_notification_record(
        self, req_id: str, contact_id: str, channel: str, status: str
    ) -> str:
        try:
            res = (
                self.db.table("contact_notifications")
                .insert({
                    "emergency_request_id": req_id,
                    "contact_id":           contact_id,
                    "channel":              channel,
                    "notification_type":    "sos_alert",
                    "status":               status,
                })
                .select("id")
                .execute()
            )
            return res.data[0]["id"] if res.data else ""
        except Exception as exc:
            logger.warning("Could not upsert notification record: %s", exc)
            return ""

    def _update_notification_record(
        self,
        record_id: str,
        status: str,
        provider_id: str | None,
        error: str | None,
    ) -> None:
        if not record_id:
            return
        try:
            update: dict[str, Any] = {"status": status}
            if provider_id:
                update["provider_message_id"] = provider_id
            if error:
                update["error_message"] = error[:500]
            if status in ("sent", "delivered", "completed", "queued", "ringing"):
                from datetime import datetime, timezone
                update["sent_at"] = datetime.now(timezone.utc).isoformat()

            self.db.table("contact_notifications").update(update).eq("id", record_id).execute()
        except Exception as exc:
            logger.warning("Could not update notification record %s: %s", record_id, exc)
