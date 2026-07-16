"""
tests/test_emergency_contacts_api.py
Tests for the emergency contact API endpoints.
"""

from __future__ import annotations

from datetime import datetime
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from tests.conftest import FAKE_USER_ID

_MOCK_CONTACT = {
    "id": "00000000-0000-0000-0000-000000000401",
    "user_id": FAKE_USER_ID,
    "full_name": "Jane Doe",
    "relationship": "spouse",
    "phone_number": "+14155550200",
    "alternate_phone": None,
    "email": None,
    "is_primary": False,
    "notify_during_emergency": True,
    "notes": None,
    "created_at": "2024-01-01T00:00:00",
    "updated_at": "2024-01-01T00:00:00",
}

_VALID_CREATE = {
    "full_name": "Jane Doe",
    "phone_number": "+14155550200",
    "is_primary": False,
}


_PATCH_USER_CLIENT_CONTACT = "app.api.v1.routes.emergency_contacts.create_user_supabase_client"
_PATCH_USER_CLIENT_NOTIFY  = "app.api.v1.routes.notifications.create_user_supabase_client"


class TestListContacts:
    def test_requires_auth(self, client: TestClient) -> None:
        response = client.get("/api/v1/emergency-contacts")
        assert response.status_code == 401

    def test_returns_list(self, authed_client: TestClient) -> None:
        from app.schemas.emergency_contact import EmergencyContactResponse
        contact = EmergencyContactResponse.model_validate(_MOCK_CONTACT)
        with patch(
            "app.repositories.emergency_contacts.EmergencyContactRepository.list_for_user",
            return_value=[contact],
        ):
            response = authed_client.get("/api/v1/emergency-contacts")
        assert response.status_code == 200
        assert response.json()["success"] is True


class TestCreateContact:
    def test_requires_auth(self, client: TestClient) -> None:
        response = client.post("/api/v1/emergency-contacts", json=_VALID_CREATE)
        assert response.status_code == 401

    def test_creates_contact(self, authed_client: TestClient) -> None:
        from unittest.mock import MagicMock
        from app.schemas.emergency_contact import EmergencyContactResponse
        contact = EmergencyContactResponse.model_validate(_MOCK_CONTACT)
        with (
            patch(_PATCH_USER_CLIENT_CONTACT, return_value=MagicMock()),
            patch(
                "app.services.emergency_contact_service.EmergencyContactRepository.phone_exists_for_user",
                return_value=False,
            ),
            patch(
                "app.services.emergency_contact_service.EmergencyContactRepository.create",
                return_value=contact,
            ),
        ):
            response = authed_client.post("/api/v1/emergency-contacts", json=_VALID_CREATE)
        assert response.status_code == 201

    def test_user_id_not_accepted_in_body(self, authed_client: TestClient) -> None:
        payload = {**_VALID_CREATE, "user_id": "00000000-0000-0000-0000-000000000099"}
        response = authed_client.post("/api/v1/emergency-contacts", json=payload)
        assert response.status_code == 422

    def test_duplicate_phone_returns_409(self, authed_client: TestClient) -> None:
        from unittest.mock import MagicMock
        with (
            patch(_PATCH_USER_CLIENT_CONTACT, return_value=MagicMock()),
            patch(
                "app.services.emergency_contact_service.EmergencyContactRepository.phone_exists_for_user",
                return_value=True,
            ),
        ):
            response = authed_client.post("/api/v1/emergency-contacts", json=_VALID_CREATE)
        assert response.status_code == 409


class TestContactOwnership:
    def test_cannot_edit_another_users_contact(self, authed_client: TestClient) -> None:
        """Returns 404 for contacts owned by other users."""
        with patch(
            "app.repositories.emergency_contacts.EmergencyContactRepository.get_by_id",
            return_value=None,
        ):
            response = authed_client.put(
                "/api/v1/emergency-contacts/00000000-0000-0000-0000-000000000499",
                json={"full_name": "Hacker", "phone_number": "+10000000000"},
            )
        assert response.status_code == 404

    def test_delete_another_users_contact_returns_404(self, authed_client: TestClient) -> None:
        with patch(
            "app.repositories.emergency_contacts.EmergencyContactRepository.get_by_id",
            return_value=None,
        ):
            response = authed_client.delete(
                "/api/v1/emergency-contacts/00000000-0000-0000-0000-000000000499"
            )
        assert response.status_code == 404


class TestSetPrimaryContact:
    def test_requires_auth(self, client: TestClient) -> None:
        response = client.post("/api/v1/emergency-contacts/some-id/primary")
        assert response.status_code == 401

    def test_not_found_returns_404(self, authed_client: TestClient) -> None:
        from unittest.mock import MagicMock
        with (
            patch(_PATCH_USER_CLIENT_CONTACT, return_value=MagicMock()),
            patch(
                "app.services.emergency_contact_service.EmergencyContactRepository.get_by_id",
                return_value=None,
            ),
        ):
            response = authed_client.post(
                "/api/v1/emergency-contacts/00000000-0000-0000-0000-000000000499/primary"
            )
        assert response.status_code == 404
