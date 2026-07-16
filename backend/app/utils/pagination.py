"""
app/utils/pagination.py
Pagination helpers for list endpoints.

Provides consistent page/page_size query parameter handling and offset
calculation throughout the API.
"""

from __future__ import annotations

from fastapi import Query
from pydantic import BaseModel

# ── Constants ─────────────────────────────────────────────────────────────

DEFAULT_PAGE: int = 1
DEFAULT_PAGE_SIZE: int = 20
MAX_PAGE_SIZE: int = 100


# ── Query parameter dependency ────────────────────────────────────────────

class PaginationParams(BaseModel):
    """Validated pagination parameters."""

    page: int
    page_size: int

    @property
    def offset(self) -> int:
        """Calculate zero-based offset for use with .range()."""
        return (self.page - 1) * self.page_size

    @property
    def limit(self) -> int:
        return self.page_size


def get_pagination(
    page: int = Query(default=DEFAULT_PAGE, ge=1, description="Page number (1-based)"),
    page_size: int = Query(
        default=DEFAULT_PAGE_SIZE,
        ge=1,
        le=MAX_PAGE_SIZE,
        alias="page_size",
        description=f"Results per page (max {MAX_PAGE_SIZE})",
    ),
) -> PaginationParams:
    """FastAPI dependency that returns validated pagination parameters."""
    return PaginationParams(page=page, page_size=page_size)
