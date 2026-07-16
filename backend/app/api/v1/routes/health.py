"""
app/api/v1/routes/health.py
Health-check route — the simplest signal that the server is running.

GET /api/v1/health
    Returns application status, name, version, and environment.
    Does NOT expose secrets, keys, database credentials, or stack traces.
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
