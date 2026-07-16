"""
app/api/dependencies/auth.py
Authentication dependency for FastAPI routes.

get_current_user()
    Reads the Authorization: Bearer <token> header, validates the token
    against Supabase Auth, and returns a CurrentUser object.

get_auth_context()
    Returns both the CurrentUser and the raw access token so repositories
    can construct an RLS-respecting Supabase client.

Security rules:
  - Never trust a client-provided user ID.
  - Never expose the access token in response payloads or logs.
  - Token validation is done via Supabase Auth's getUser(), which makes a
    server-side call to verify the JWT — not a local decode-only path.
  - The service-role key is never used merely to identify a user.
"""

from __future__ import annotations

import logging
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, EmailStr
from supabase import Client, create_client

from app.core.config import get_settings

logger = logging.getLogger("medicare.auth")

# HTTPBearer extracts the token from `Authorization: Bearer <token>`
_bearer_scheme = HTTPBearer(auto_error=False)


# ── Models ────────────────────────────────────────────────────────────────


class CurrentUser(BaseModel):
    """Safe representation of the validated Supabase user.

    Only id and email are exposed — no tokens, raw metadata or internal fields.
    """

    id: str
    email: EmailStr | None = None


class AuthContext(BaseModel):
    """Combines the validated user with the raw access token.

    Repositories use the access token to build a user-scoped Supabase client
    that passes the JWT to PostgREST, allowing RLS to evaluate auth.uid().

    IMPORTANT: Never include AuthContext (or access_token) in API responses.
    """

    user: CurrentUser
    access_token: str

    model_config = {"arbitrary_types_allowed": True}


# ── User-scoped Supabase client ───────────────────────────────────────────


def create_user_supabase_client(access_token: str) -> Client:
    """Return a Supabase client configured with the user's JWT.

    The anon key is used to create the client, but the user's JWT is
    attached via postgrest.auth() so PostgREST evaluates auth.uid() from
    the user's token — not the anon key.  RLS policies apply normally.

    This is intentionally NOT cached because each user has a different token.
    """
    settings = get_settings()
    client = create_client(settings.supabase_url, settings.supabase_anon_key)
    # Attach the JWT to PostgREST requests so RLS can evaluate auth.uid()
    client.postgrest.auth(access_token)
    return client


# ── Core dependency ───────────────────────────────────────────────────────


async def get_current_user(
    credentials: Annotated[
        HTTPAuthorizationCredentials | None, Depends(_bearer_scheme)
    ],
) -> CurrentUser:
    """Validate the Bearer token and return the authenticated user.

    Raises HTTP 401 for:
    - Missing Authorization header
    - Non-Bearer scheme
    - Invalid or expired token
    - Supabase returns no user data

    Never trusts client-supplied user IDs.
    """
    if credentials is None or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Provide a valid Bearer token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    settings = get_settings()

    try:
        # Use admin client for token validation — this calls Supabase Auth's
        # getUser() endpoint which cryptographically verifies the JWT.
        admin_client = create_client(
            settings.supabase_url, settings.supabase_service_role_key
        )
        response = admin_client.auth.get_user(token)
    except Exception as exc:
        logger.warning("Token validation error: %s", type(exc).__name__)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token is invalid or expired.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    if response is None or response.user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token is invalid or expired.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = response.user
    return CurrentUser(
        id=str(user.id),
        email=user.email or None,
    )


async def get_auth_context(
    credentials: Annotated[
        HTTPAuthorizationCredentials | None, Depends(_bearer_scheme)
    ],
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
) -> AuthContext:
    """Return both the validated user and the raw access token.

    Used by route handlers that need to build RLS-respecting Supabase clients.
    The token is never logged or included in responses.
    """
    # credentials is already validated by get_current_user, so it is not None here
    return AuthContext(
        user=current_user,
        access_token=credentials.credentials,  # type: ignore[union-attr]
    )
