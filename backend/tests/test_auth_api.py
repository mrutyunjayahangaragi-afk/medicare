"""
tests/test_auth_api.py
Tests for the authentication endpoints.

GET /api/v1/auth/me
"""

from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient


class TestAuthMe:
    def test_missing_token_returns_401(self, client: TestClient) -> None:
        response = client.get("/api/v1/auth/me")
        assert response.status_code == 401

    def test_invalid_token_returns_401(self, client: TestClient) -> None:
        response = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": "Bearer invalid-token"},
        )
        assert response.status_code == 401

    def test_401_response_has_success_false(self, client: TestClient) -> None:
        payload = client.get("/api/v1/auth/me").json()
        assert payload.get("success") is False

    def test_authenticated_me_succeeds(self, authed_client: TestClient) -> None:
        """Dependency is overridden — should return 200 with user identity."""
        from unittest.mock import patch
        from tests.conftest import FAKE_USER_ID

        # Mock the profile repository to return a profile
        with patch(
            "app.api.v1.routes.auth.ProfileRepository.get_by_id",
            return_value=None,
        ):
            response = authed_client.get("/api/v1/auth/me")
        assert response.status_code == 200
        payload = response.json()
        assert payload["success"] is True
        assert payload["data"]["id"] == FAKE_USER_ID

    def test_me_does_not_expose_token(self, authed_client: TestClient) -> None:
        with patch("app.api.v1.routes.auth.ProfileRepository.get_by_id", return_value=None):
            response = authed_client.get("/api/v1/auth/me")
        payload = str(response.json())
        assert "access_token" not in payload
        assert "refresh_token" not in payload
        assert "service_role" not in payload

    def test_me_does_not_expose_raw_metadata(self, authed_client: TestClient) -> None:
        with patch("app.api.v1.routes.auth.ProfileRepository.get_by_id", return_value=None):
            response = authed_client.get("/api/v1/auth/me")
        payload = response.json()
        data = payload.get("data", {})
        assert "raw_user_meta_data" not in data
        assert "identities" not in data

    def test_non_bearer_scheme_returns_401(self, client: TestClient) -> None:
        response = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": "Basic dXNlcjpwYXNz"},
        )
        assert response.status_code == 401
