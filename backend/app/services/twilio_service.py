"""
app/services/twilio_service.py
Twilio SMS and voice-call service for emergency contact alerts.

Security:
  - All Twilio credentials are loaded from server-side environment variables only.
  - Phone numbers are never logged in full — last 4 digits only.
  - The backend loads the primary contact itself; no phone number is accepted
    from the frontend to prevent arbitrary dialling.
  - Callback signature validation is handled in the Twilio routes.
  - Never enabled in test environments unless TWILIO_TEST_MODE=true.
"""

from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger("medicare.services.twilio")

# ── Configuration keys expected in env ────────────────────────────────

_REQUIRED_KEYS = (
    "TWILIO_ACCOUNT_SID",
    "TWILIO_AUTH_TOKEN",
    "TWILIO_PHONE_NUMBER",
)


def _mask_phone(phone: str) -> str:
    """Return only the last 4 digits for safe logging."""
    return "****" + phone[-4:] if len(phone) >= 4 else "****"


class TwilioServiceError(Exception):
    """Raised when Twilio is mis-configured or the API call fails."""


class TwilioService:
    """
    Thin wrapper around the Twilio REST API.

    Creates a new client on each instantiation so settings changes
    (e.g. test vs production) are picked up immediately.
    """

    def __init__(self) -> None:
        from app.core.config import get_settings

        self.settings = get_settings()
        self._client: Any = None

    # ── Internal helpers ──────────────────────────────────────────────

    def _is_enabled(self) -> bool:
        return getattr(self.settings, "twilio_enabled", False)

    def _get_client(self) -> Any:
        """Lazily initialise the Twilio REST client."""
        if self._client is not None:
            return self._client

        try:
            from twilio.rest import Client as TwilioClient  # type: ignore[import-untyped]
        except ImportError as exc:
            raise TwilioServiceError(
                "twilio package is not installed. "
                "Add 'twilio' to requirements.txt and redeploy."
            ) from exc

        sid   = getattr(self.settings, "twilio_account_sid",  None)
        token = getattr(self.settings, "twilio_auth_token",   None)

        if not sid or not token:
            raise TwilioServiceError(
                "TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN must be set."
            )

        self._client = TwilioClient(sid, token)
        return self._client

    def _from_number(self) -> str:
        num = getattr(self.settings, "twilio_phone_number", None)
        if not num:
            raise TwilioServiceError("TWILIO_PHONE_NUMBER is not configured.")
        return num

    def _messaging_service_sid(self) -> str | None:
        return getattr(self.settings, "twilio_messaging_service_sid", None)

    # ── SMS ───────────────────────────────────────────────────────────

    def send_sms(
        self,
        to_number: str,
        body: str,
        status_callback_url: str | None = None,
    ) -> dict[str, Any]:
        """
        Send an SMS to `to_number`.

        Returns a dict with:
          sid, status, to (masked), error_code, error_message

        Raises TwilioServiceError on configuration or API failure.
        """
        if not self._is_enabled():
            raise TwilioServiceError("Twilio is disabled (TWILIO_ENABLED=false).")

        client = self._get_client()
        messaging_sid = self._messaging_service_sid()

        try:
            params: dict[str, Any] = {
                "to":   to_number,
                "body": body,
            }
            if messaging_sid:
                params["messaging_service_sid"] = messaging_sid
            else:
                params["from_"] = self._from_number()

            if status_callback_url:
                params["status_callback"] = status_callback_url

            msg = client.messages.create(**params)

            logger.info(
                "SMS sent sid=%s to=%s status=%s",
                msg.sid,
                _mask_phone(to_number),
                msg.status,
            )

            return {
                "sid":           msg.sid,
                "status":        msg.status,
                "to":            _mask_phone(to_number),
                "error_code":    msg.error_code,
                "error_message": msg.error_message,
            }

        except TwilioServiceError:
            raise
        except Exception as exc:
            logger.error(
                "SMS failed to=%s error=%s",
                _mask_phone(to_number),
                str(exc)[:200],
            )
            raise TwilioServiceError(f"SMS delivery failed: {exc}") from exc

    # ── Voice call ────────────────────────────────────────────────────

    def place_call(
        self,
        to_number: str,
        twiml_url: str,
        status_callback_url: str | None = None,
        timeout: int = 30,
    ) -> dict[str, Any]:
        """
        Initiate an outbound voice call to `to_number`.

        `twiml_url` must be a publicly accessible URL that returns TwiML.

        Returns a dict with: sid, status, to (masked)
        Raises TwilioServiceError on failure.
        """
        if not self._is_enabled():
            raise TwilioServiceError("Twilio is disabled (TWILIO_ENABLED=false).")

        client = self._get_client()

        try:
            params: dict[str, Any] = {
                "to":      to_number,
                "from_":   self._from_number(),
                "url":     twiml_url,
                "timeout": timeout,
            }
            if status_callback_url:
                params["status_callback"]        = status_callback_url
                params["status_callback_method"] = "POST"

            call = client.calls.create(**params)

            logger.info(
                "Call initiated sid=%s to=%s status=%s",
                call.sid,
                _mask_phone(to_number),
                call.status,
            )

            return {
                "sid":    call.sid,
                "status": call.status,
                "to":     _mask_phone(to_number),
            }

        except TwilioServiceError:
            raise
        except Exception as exc:
            logger.error(
                "Call failed to=%s error=%s",
                _mask_phone(to_number),
                str(exc)[:200],
            )
            raise TwilioServiceError(f"Call initiation failed: {exc}") from exc

    # ── Signature validation (for callbacks) ─────────────────────────

    @staticmethod
    def validate_signature(
        auth_token: str,
        signature: str,
        url: str,
        params: dict[str, str],
    ) -> bool:
        """
        Validate a Twilio request signature.
        Returns False when validation fails instead of raising.
        """
        try:
            from twilio.request_validator import RequestValidator  # type: ignore[import-untyped]
            validator = RequestValidator(auth_token)
            return validator.validate(url, params, signature)
        except Exception as exc:
            logger.warning("Twilio signature validation error: %s", exc)
            return False
