"""
app/api/v1/routes/health.py
Health-check routes.

GET /api/v1/health           — liveness check
GET /api/v1/health/services  — safe service dependency status (no secrets exposed)
"""

from __future__ import annotations

import logging

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.core.config import get_settings
from app.schemas.common import HealthResponse

logger = logging.getLogger("medicare.api.health")

router = APIRouter()


@router.get(
    "",
    response_model=HealthResponse,
    summary="Health check",
    description=(
        "Returns a lightweight status payload confirming the server is reachable. "
        "Safe to poll from monitoring tools and the frontend."
    ),
    tags=["Health"],
)
async def health_check() -> HealthResponse:
    """Return the current health status of the Medicare API."""
    settings = get_settings()
    logger.debug("Health check requested")
    return HealthResponse(
        status="healthy",
        app=settings.app_name,
        version=settings.app_version,
        environment=settings.app_env,
    )


@router.get(
    "/services",
    summary="Service dependency status",
    description=(
        "Returns safe boolean status for each integrated service. "
        "Never exposes API keys, tokens, or connection strings."
    ),
    tags=["Health"],
)
async def services_health() -> dict:
    """
    Safe diagnostic endpoint — reports whether each dependency is configured.

    Returns:
        api:            always 'healthy'
        supabase:       'configured' when URL + keys are present
        gemini:         'configured' | 'not_configured'
        geoapify:       'configured' | 'not_configured' | 'disabled'
        severity_model: 'ready' | 'not_ready' | 'disabled'
    """
    settings = get_settings()

    # Supabase — check URL is a real URL (not the example placeholder)
    supabase_ok = bool(
        settings.supabase_url
        and "your-project-id" not in settings.supabase_url
        and settings.supabase_anon_key
        and settings.supabase_service_role_key
    )

    # Gemini
    gemini_ok = bool(settings.gemini_api_key and settings.ai_assistant_enabled)

    # Geoapify
    if not settings.geoapify_enabled:
        geoapify_status = "disabled"
    elif settings.geoapify_api_key:
        geoapify_status = "configured"
    else:
        geoapify_status = "not_configured"

    # ML severity model
    if not settings.ml_severity_enabled:
        severity_status = "disabled"
    else:
        try:
            from ml.severity.src.model_registry import ModelRegistry
            ModelRegistry.get()
            severity_status = "ready"
        except Exception:
            severity_status = "not_ready"

    return {
        "api": "healthy",
        "supabase": "configured" if supabase_ok else "not_configured",
        "gemini": "configured" if gemini_ok else "not_configured",
        "geoapify": geoapify_status,
        "severity_model": severity_status,
    }
