"""
app/main.py
FastAPI application factory for the Medicare backend.

Responsibilities:
- Create and configure the FastAPI application instance.
- Register CORS middleware (only explicit frontend origins).
- Mount the versioned API router.
- Register global exception handlers.
- Expose a root welcome endpoint.
- Run lifespan startup / shutdown logging.
"""

from __future__ import annotations

import logging
import uuid
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

from app.api.v1.api import api_router
from app.core.config import get_settings
from app.core.exceptions import register_exception_handlers
from app.core.logging import configure_logging

# ── Bootstrap ─────────────────────────────────────────────────────────────
# Settings and logging must be initialised before anything else so that
# config errors surface immediately and all subsequent log calls work.
settings = get_settings()
configure_logging(settings.debug)

logger = logging.getLogger("medicare.api")


# ── Lifespan ───────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Handle application startup and graceful shutdown."""
    logger.info(
        "Starting %s v%s [%s]",
        settings.app_name,
        settings.app_version,
        settings.app_env,
    )
    logger.info(
        "CORS origins allowed: %s",
        settings.backend_cors_origins,
    )
    logger.info("API prefix: %s", settings.api_v1_prefix)
    yield
    logger.info("Stopping %s", settings.app_name)


# ── Application instance ───────────────────────────────────────────────────

# Disable interactive docs outside development/testing — reduces attack surface
# in staging/production where Swagger UI adds no value but exposes the schema.
_is_dev = settings.app_env.lower() in ("development", "dev", "local", "testing", "test")

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description=(
        "Backend API for the Medicare emergency assistance platform. "
        "Provides emergency request management, responder coordination, "
        "nearby services, and analytics."
    ),
    debug=settings.debug,
    lifespan=lifespan,
    docs_url="/docs" if _is_dev else None,
    redoc_url="/redoc" if _is_dev else None,
    openapi_url="/openapi.json" if _is_dev else None,
)


# ── OpenAPI security scheme ────────────────────────────────────────────────

def _custom_openapi() -> dict:
    if app.openapi_schema:
        return app.openapi_schema
    schema = get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes,
    )
    schema.setdefault("components", {}).setdefault("securitySchemes", {})
    schema["components"]["securitySchemes"]["BearerAuth"] = {
        "type": "http",
        "scheme": "bearer",
        "bearerFormat": "JWT",
        "description": "Supabase access token. Obtain via Supabase Auth.",
    }
    # Apply security globally — each route can override
    schema["security"] = [{"BearerAuth": []}]
    app.openapi_schema = schema
    return schema


app.openapi = _custom_openapi  # type: ignore[method-assign]


# ── Middleware ─────────────────────────────────────────────────────────────

# Use an explicit allow-list for headers instead of "*".
# "*" combined with allow_credentials=True is overly permissive and
# inconsistent with the CORS spec (credentials + wildcard is browser-rejected
# for non-simple requests in modern engines anyway).
_ALLOWED_HEADERS = [
    "Authorization",
    "Content-Type",
    "Accept",
    "X-Request-ID",
    "X-Supabase-Auth",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.backend_cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=_ALLOWED_HEADERS,
)


# ── Request ID middleware ──────────────────────────────────────────────────

class RequestIDMiddleware(BaseHTTPMiddleware):
    """Attach a unique X-Request-ID to every request and response.

    Reads the client-supplied header when present and valid (UUID format).
    Generates a new UUID when the header is missing or invalid.
    """

    _MAX_ID_LENGTH = 64

    async def dispatch(self, request: Request, call_next: object) -> Response:
        raw = request.headers.get("X-Request-ID", "")
        # Validate length and attempt to parse as UUID to prevent log injection
        request_id = ""
        if raw and len(raw) <= self._MAX_ID_LENGTH:
            try:
                request_id = str(uuid.UUID(raw))
            except ValueError:
                request_id = str(uuid.uuid4())
        else:
            request_id = str(uuid.uuid4())

        response: Response = await call_next(request)  # type: ignore[operator]
        response.headers["X-Request-ID"] = request_id
        return response


app.add_middleware(RequestIDMiddleware)


# ── Exception handlers ─────────────────────────────────────────────────────

register_exception_handlers(app)


# ── Routes ─────────────────────────────────────────────────────────────────

@app.get(
    "/",
    summary="Welcome",
    description="Root endpoint — confirms the API is reachable and provides navigation links.",
    tags=["Root"],
    response_class=JSONResponse,
)
async def root() -> dict[str, str]:
    """Welcome message with link to health check."""
    response: dict[str, str] = {
        "message": f"Welcome to {settings.app_name}",
        "version": settings.app_version,
        "health": f"{settings.api_v1_prefix}/health",
    }
    if _is_dev:
        response["docs"] = "/docs"
        response["redoc"] = "/redoc"
    return response


app.include_router(
    api_router,
    prefix=settings.api_v1_prefix,
)
