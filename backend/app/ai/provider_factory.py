"""
app/ai/provider_factory.py
Returns the configured AIProvider.

Only Gemini is supported as the primary generative AI provider.

The provider is NOT a singleton — each call creates a new instance so config
changes are picked up immediately and stale credentials are never reused.

Raises ProviderUnavailableError when the Gemini key is missing so the
AssistantService can return HTTP 503 instead of crashing at startup.
"""

from __future__ import annotations

import logging

from app.ai.base import AIProvider
from app.ai.exceptions import ProviderUnavailableError
from app.core.config import get_settings

logger = logging.getLogger("medicare.ai.provider_factory")


def get_ai_provider() -> AIProvider:
    """
    Return a GeminiProvider.

    Called lazily from AssistantService so a missing GEMINI_API_KEY raises
    ProviderUnavailableError (→ HTTP 503) rather than crashing startup.
    """
    settings = get_settings()

    if not settings.gemini_api_key:
        raise ProviderUnavailableError(
            "GEMINI_API_KEY is not configured. "
            "Set it in backend/.env or in the Render environment variables."
        )

    from app.ai.gemini_provider import GeminiProvider

    logger.debug("AI provider: gemini model=%s", settings.gemini_model)
    return GeminiProvider()
