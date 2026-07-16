"""
tests/test_profile_api.py
Tests for the profile API endpoints.

GET   /api/v1/profile
PUT   /api/v1/profile
PATCH /api/v1/profile
"""

from __future__ import annotations

from datetime import datetime
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from tests.conftest import FAKE_USER_ID

_MOCK_PROFILE = {
    "id": FAKE_USER_ID,
    "full_name": "Test User",
    "email": "testuser@example.com",
    "phone": None,
    "avatar_url": None,
    "date_of_birth": None,
    "gender": None,
    "address": None,
    "blood_group": None,
    "allergies": None,
    "medical_conditions": None,
    "current_medications": None,
    "medical_notes": None,
    "hospital_name": None,
    "role": "user",
    "availability_status": "offline",
    "is_verified": False,
    "created_at": "2024-01-01T00:00:00",
    "updated_at": "2024-01-01T00:00:00",
}


class TestGetProfile:
    def test_requires_auth(self, client: TestClient) -> None:
        response = client.get("/api/v1/profile")
        assert response.status_code == 401

    def test_returns_own_profile(self, authed_client: TestClient) -> None:
        from app.schemas.database.profile import ProfileRow
        profile = ProfileRow.model_validate(_MOCK_PROFILE)
        with patch(
            "app.services.profile_service.ProfileRepository.get_by_id",
            return_value=profile,
        ):
            response = authed_client.get("/api/v1/profile")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["id"] == FAKE_USER_ID

    def test_returns_404_when_profile_missing(self, authed_client: TestClient) -> None:
        with patch(
            "app.services.profile_service.ProfileRepository.get_by_id",
            return_value=None,
        ):
            response = authed_client.get("/api/v1/profile")
        assert response.status_code == 404

    def test_profile_does_not_expose_service_role_key(self, authed_client: TestClient) -> None:
        from app.schemas.database.profile import ProfileRow
        profile = ProfileRow.model_validate(_MOCK_PROFILE)
        with patch(
            "app.services.profile_service.ProfileRepository.get_by_id",
            return_value=profile,
        ):
            response = authed_client.get("/api/v1/profile")
        payload_str = str(response.json())
        assert "service_role" not in payload_str
        assert "supabase_service_role" not in payload_str


class TestUpdateProfile:
    def test_put_requires_auth(self, client: TestClient) -> None:
        response = client.put("/api/v1/profile", json={"full_name": "New Name"})
        assert response.status_code == 401

    def test_put_updates_editable_fields(self, authed_client: TestClient) -> None:
        from app.schemas.database.profile import ProfileRow
        updated = {**_MOCK_PROFILE, "full_name": "Updated Name"}
        profile = ProfileRow.model_validate(updated)
        with patch(
            "app.services.profile_service.ProfileRepository.update_safe_fields",
            return_value=profile,
        ):
            response = authed_client.put("/api/v1/profile", json={"full_name": "Updated Name"})
        assert response.status_code == 200
        assert response.json()["data"]["full_name"] == "Updated Name"

    def test_put_rejects_protected_role_field(self, authed_client: TestClient) -> None:
        """Role field must be rejected with extra='forbid'."""
        response = authed_client.put("/api/v1/profile", json={"role": "admin"})
        assert response.status_code == 422

    def test_put_rejects_organization_id(self, authed_client: TestClient) -> None:
        response = authed_client.put(
            "/api/v1/profile",
            json={"organization_id": "00000000-0000-0000-0000-000000000099"},
        )
        assert response.status_code == 422

    def test_patch_requires_auth(self, client: TestClient) -> None:
        response = client.patch("/api/v1/profile", json={"full_name": "X"})
        assert response.status_code == 401

    def test_patch_partial_update(self, authed_client: TestClient) -> None:
        from app.schemas.database.profile import ProfileRow
        updated = {**_MOCK_PROFILE, "address": "123 Main St"}
        profile = ProfileRow.model_validate(updated)
        with patch(
            "app.services.profile_service.ProfileRepository.update_safe_fields",
            return_value=profile,
        ):
            response = authed_client.patch("/api/v1/profile", json={"address": "123 Main St"})
        assert response.status_code == 200
        assert response.json()["data"]["address"] == "123 Main St"

    def test_patch_rejects_is_verified(self, authed_client: TestClient) -> None:
        response = authed_client.patch("/api/v1/profile", json={"is_verified": True})
        assert response.status_code == 422
