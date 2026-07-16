"""
app/schemas/common.py
Shared Pydantic response models used across the entire API.

Centralising them here ensures a consistent response envelope and makes
it easy to update the shape project-wide in one place.
"""

from __future__ import annotations

from typing import Any, Generic, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class APIResponse(BaseModel):
    """Generic API response envelope.

    All API routes should return this model (or a subclass) so clients
    can always rely on the presence of 'success' and 'message'.
    """

    success: bool
    message: str
    data: Any | None = None


class PaginatedData(BaseModel, Generic[T]):
    """Paginated list payload embedded in APIResponse.data."""

    items: list[T]
    page: int
    page_size: int
    total: int
    has_next: bool


class HealthResponse(BaseModel):
    """Response schema for the health-check endpoint.

    Only safe, non-secret information is included.
    Never add keys, tokens, database URLs, or internal paths here.
    """

    status: str
    app: str
    version: str
    environment: str
