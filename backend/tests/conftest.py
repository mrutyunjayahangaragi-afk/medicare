"""
tests/conftest.py
Shared pytest fixtures for the Medicare backend test suite.

The session-scoped `client` is unauthenticated (no overrides).
The session-scoped `authed_client` overrides get_current_user and get_auth_context
so no real Supabase calls are made.

No production data is read or modified from automated tests.
"""

from __future__ import annotations

import os
from datetime import datetime
from typing import Generator

import pytest
from fastapi.testclient import TestClient

from app.api.dependencies.auth import AuthContext, CurrentUser
from app.schemas.database.profile import AvailabilityStatus, ProfileRow, UserRole

# ── Fake test identities ──────────────────────────────────────────────────

FAKE_USER_ID    = "00000000-0000-0000-0000-000000000001"
FAKE_USER_EMAIL = "testuser@example.com"
FAKE_RESPONDER_ID    = "00000000-0000-0000-0000-000000000002"
FAKE_RESPONDER_EMAIL = "responder@example.com"
FAKE_ACCESS_TOKEN = "fake-access-token-for-tests"


def pytest_configure(config: pytest.Config) -> None:  # noqa: ARG001
    os.environ.setdefault("APP_ENV", "test")
    os.environ.setdefault("DEBUG", "false")
    os.environ.setdefault("SUPABASE_URL", "https://placeholder.supabase.co")
    os.environ.setdefault("SUPABASE_ANON_KEY", "test-anon-key")
    os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key")


def _make_fake_profile(user_id: str, role: UserRole = UserRole.user) -> ProfileRow:
    return ProfileRow(
        id=user_id,  # type: ignore[arg-type]
        full_name="Test User",
        email=FAKE_USER_EMAIL,
        role=role,
        availability_status=AvailabilityStatus.available,
        is_verified=False,
        created_at=datetime(2024, 1, 1),
        updated_at=datetime(2024, 1, 1),
    )


@pytest.fixture(scope="session")
def _app():
    """Return the FastAPI app with a cleared settings cache."""
    from app.core.config import get_settings
    get_settings.cache_clear()
    from app.main import app
    return app


@pytest.fixture()
def client(_app) -> TestClient:
    """Unauthenticated TestClient — auth dependency raises 401 (no network call)."""
    from app.api.dependencies.auth import get_current_user, get_auth_context
    from fastapi import HTTPException, status

    def _raise_401():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Provide a valid Bearer token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    saved = dict(_app.dependency_overrides)
    _app.dependency_overrides[get_current_user] = _raise_401
    _app.dependency_overrides[get_auth_context] = _raise_401
    yield TestClient(_app, raise_server_exceptions=False)
    _app.dependency_overrides.clear()
    _app.dependency_overrides.update(saved)


@pytest.fixture(scope="session")
def authed_client(_app) -> TestClient:
    """TestClient with auth overridden to a fake normal user."""
    from app.api.dependencies.auth import get_current_user, get_auth_context

    fake_user = CurrentUser(id=FAKE_USER_ID, email=FAKE_USER_EMAIL)
    fake_ctx  = AuthContext(user=fake_user, access_token=FAKE_ACCESS_TOKEN)

    _app.dependency_overrides[get_current_user] = lambda: fake_user
    _app.dependency_overrides[get_auth_context]  = lambda: fake_ctx

    yield TestClient(_app, raise_server_exceptions=False)
    _app.dependency_overrides.pop(get_current_user, None)
    _app.dependency_overrides.pop(get_auth_context, None)


@pytest.fixture(scope="session")
def responder_client(_app) -> TestClient:
    """TestClient with auth overridden to a fake responder."""
    from app.api.dependencies.auth import get_current_user, get_auth_context
    from app.api.dependencies.roles import require_responder

    fake_user = CurrentUser(id=FAKE_RESPONDER_ID, email=FAKE_RESPONDER_EMAIL)
    fake_ctx  = AuthContext(user=fake_user, access_token=FAKE_ACCESS_TOKEN)

    _app.dependency_overrides[get_current_user]  = lambda: fake_user
    _app.dependency_overrides[get_auth_context]   = lambda: fake_ctx
    _app.dependency_overrides[require_responder]  = lambda: fake_user

    yield TestClient(_app, raise_server_exceptions=False)
    _app.dependency_overrides.pop(get_current_user, None)
    _app.dependency_overrides.pop(get_auth_context, None)
    _app.dependency_overrides.pop(require_responder, None)

