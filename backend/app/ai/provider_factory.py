import logging

from app.ai.base import AIProvider
from app.ai.gemini_provider import GeminiProvider
from app.core.config import get_settings

logger = logging.getLogger(__name__)


def get_ai_provider() -> AIProvider:
    """
    Returns the configured AI provider.
    Currently, only Gemini is supported as the primary generative AI provider.
    Hugging Face is intentionally skipped for Step 16 unless explicitly enabled in future.
    """
    settings = get_settings()
    
    if settings.ai_provider == "gemini":
        return GeminiProvider()
    
    # If a fallback provider is requested but not implemented, default to Gemini
    # and let Gemini's fallback logic handle failures.
    logger.warning(f"Requested AI provider '{settings.ai_provider}' is not fully supported in this step. Defaulting to Gemini.")
    return GeminiProvider()
