"""
app/core/exceptions.py
Global exception handlers registered in app/main.py.

Rules:
- Log technical details server-side only.
- Never return raw Python tracebacks, database details, or secrets.
- Preserve FastAPI's correct HTTP status codes.
- Return structured JSON consistent with APIResponse.
"""

from __future__ import annotations

import logging

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger("medicare.exceptions")


# ── Handler implementations ───────────────────────────────────────────────


async def _http_exception_handler(
    request: Request, exc: StarletteHTTPException
) -> JSONResponse:
    """Handle HTTP exceptions (404, 405, etc.) with a consistent shape."""
    logger.info(
        "HTTP %s on %s %s",
        exc.status_code,
        request.method,
        request.url.path,
    )
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "message": exc.detail or "An HTTP error occurred.",
            "data": None,
        },
    )


async def _validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    """Handle Pydantic request-validation errors.

    Returns a 422 with field-level details so clients can surface useful
    messages, without leaking internal implementation details.
    """
    logger.info(
        "Validation error on %s %s: %d error(s)",
        request.method,
        request.url.path,
        len(exc.errors()),
    )
    # Build a clean list — omit 'url' (points to Pydantic docs, not useful)
    errors = [
        {"field": " → ".join(str(loc) for loc in err["loc"]), "message": err["msg"]}
        for err in exc.errors()
    ]
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "message": "Request validation failed.",
            "data": errors,
        },
    )


async def _unhandled_exception_handler(
    request: Request, exc: Exception
) -> JSONResponse:
    """Catch-all for unexpected server errors.

    Logs the full traceback server-side but returns only a safe generic
    message to the client.
    """
    logger.exception(
        "Unhandled exception on %s %s",
        request.method,
        request.url.path,
    )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "message": "An unexpected server error occurred.",
            "data": None,
        },
    )


# ── Registration helper ───────────────────────────────────────────────────


def register_exception_handlers(app: FastAPI) -> None:
    """Attach all global exception handlers to the FastAPI application."""
    app.add_exception_handler(StarletteHTTPException, _http_exception_handler)  # type: ignore[arg-type]
    app.add_exception_handler(RequestValidationError, _validation_exception_handler)  # type: ignore[arg-type]
    app.add_exception_handler(Exception, _unhandled_exception_handler)  # type: ignore[arg-type]
