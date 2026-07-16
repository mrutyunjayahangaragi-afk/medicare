"""
app/schemas/auth.py
Response schemas for authentication endpoints.

Never include access tokens, refresh tokens, password hashes,
service-role keys, or raw Supabase metadata in these schemas.
"""

from __future__ import annotations

from pydantic import BaseModel, EmailStr


class MeResponse(BaseModel):
    """Safe representation of the current authenticated user.

    Returned by GET /api/v1/auth/me.
    No tokens, no raw metadata, no role information from the JWT.
    Role is read from the trusted database profile.
    """

    id: str
    email: EmailStr | None = None
    provider: str | None = None
    role: str | None = None
    full_name: str | None = None
    avatar_url: str | None = None
