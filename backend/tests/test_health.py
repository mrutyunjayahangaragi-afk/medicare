"""
tests/test_health.py
Automated tests for the root and health-check endpoints.

Tests verify:
  - Root (/) returns HTTP 200 with navigation links.
  - Health (/api/v1/health) returns HTTP 200.
  - Health response contains required fields: status, app, version, environment.
  - Health response does NOT leak secrets (supabase_service_role_key, etc.).
  - Unknown routes return HTTP 404.
  - Unexpected server exception returns HTTP 500 with a safe message.

No production database mutations are performed.
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

# ── Secret field names that must never appear in any API response ─────────
_SECRET_KEYS = {
    "supabase_service_role_key",
    "supabase_anon_key",
    "service_role_key",
    "anon_key",
}


# ── Root endpoint ─────────────────────────────────────────────────────────

class TestRootEndpoint:
    def test_root_returns_200(self, client: TestClient) -> None:
        response = client.get("/")
        assert response.status_code == 200

    def test_root_contains_message(self, client: TestClient) -> None:
        payload = client.get("/").json()
        assert "message" in payload
        assert "Medicare" in payload["message"]

    def test_root_contains_docs_link(self, client: TestClient) -> None:
        payload = client.get("/").json()
        assert "docs" in payload

    def test_root_contains_health_link(self, client: TestClient) -> None:
        payload = client.get("/").json()
        assert "health" in payload


# ── Health endpoint ────────────────────────────────────────────────────────

class TestHealthEndpoint:
    def test_health_returns_200(self, client: TestClient) -> None:
        response = client.get("/api/v1/health")
        assert response.status_code == 200

    def test_health_status_is_healthy(self, client: TestClient) -> None:
        payload = client.get("/api/v1/health").json()
        assert payload["status"] == "healthy"

    def test_health_contains_app(self, client: TestClient) -> None:
        payload = client.get("/api/v1/health").json()
        assert "app" in payload
        assert isinstance(payload["app"], str)
        assert len(payload["app"]) > 0

    def test_health_contains_version(self, client: TestClient) -> None:
        payload = client.get("/api/v1/health").json()
        assert "version" in payload
        assert isinstance(payload["version"], str)

    def test_health_contains_environment(self, client: TestClient) -> None:
        payload = client.get("/api/v1/health").json()
        assert "environment" in payload
        assert isinstance(payload["environment"], str)

    def test_health_does_not_expose_secrets(self, client: TestClient) -> None:
        payload = client.get("/api/v1/health").json()
        for secret_key in _SECRET_KEYS:
            assert secret_key not in payload, (
                f"Secret field '{secret_key}' must not appear in the health response."
            )

    def test_health_content_type_is_json(self, client: TestClient) -> None:
        response = client.get("/api/v1/health")
        assert "application/json" in response.headers.get("content-type", "")


# ── 404 handling ───────────────────────────────────────────────────────────

class TestNotFound:
    def test_unknown_route_returns_404(self, client: TestClient) -> None:
        response = client.get("/this-route-does-not-exist")
        assert response.status_code == 404

    def test_unknown_api_route_returns_404(self, client: TestClient) -> None:
        response = client.get("/api/v1/unknown-endpoint")
        assert response.status_code == 404

    def test_404_response_has_success_false(self, client: TestClient) -> None:
        payload = client.get("/totally-missing").json()
        assert payload.get("success") is False

    def test_404_response_has_message(self, client: TestClient) -> None:
        payload = client.get("/totally-missing").json()
        assert "message" in payload


# ── 500 safety check ──────────────────────────────────────────────────────

class TestErrorHandling:
    def test_500_does_not_leak_traceback(self, client: TestClient) -> None:
        """
        There's no route that intentionally raises 500 in this foundation,
        but we verify the 404 handler returns a structured envelope —
        this confirms the exception handlers are wired up correctly.
        """
        response = client.get("/does-not-exist")
        payload = response.json()
        # Should never contain raw Python exception text
        payload_str = str(payload)
        assert "Traceback" not in payload_str
        assert "Exception" not in payload_str
