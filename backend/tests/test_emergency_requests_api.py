"""
tests/test_emergency_requests_api.py
Tests for the emergency request API endpoints.
"""

from __future__ import annotations

from datetime import datetime
from unittest.mock import MagicMock, patch
from uuid import UUID

import pytest
from fastapi.testclient import TestClient

from tests.conftest import FAKE_USER_ID

_VALID_PAYLOAD = {
    "emergency_type": "medical",
    "severity": "high",
    "description": "Patient is having a heart attack and needs immediate help.",
    "latitude": 37.7749,
    "longitude": -122.4194,
    "contact_number": "+14155550100",
}

_MOCK_ROW = {
    "id": "aaaaaaaa-0000-0000-0000-000000000001",
    "user_id": FAKE_USER_ID,
    "emergency_type": "medical",
    "severity": "high",
    "description": "Patient is having a heart attack and needs immediate help.",
    "latitude": 37.7749,
    "longitude": -122.4194,
    "location_accuracy": None,
    "manual_address": None,
    "contact_number": "+14155550100",
    "status": "pending",
    "assigned_responder_id": None,
    "assigned_at": None,
    "accepted_at": None,
    "in_progress_at": None,
    "arrived_at": None,
    "completed_at": None,
    "cancelled_at": None,
    "created_at": "2024-01-01T00:00:00",
    "updated_at": "2024-01-01T00:00:00",
}


class TestCreateEmergencyRequest:
    def test_requires_auth(self, client: TestClient) -> None:
        response = client.post("/api/v1/emergency-requests", json=_VALID_PAYLOAD)
        assert response.status_code == 401

    def test_creates_request(self, authed_client: TestClient) -> None:
        from app.schemas.database.emergency_request import EmergencyRequestRow
        row = EmergencyRequestRow.model_validate(_MOCK_ROW)
        with patch(
            "app.services.emergency_request_service.EmergencyRequestRepository.create",
            return_value=row,
        ):
            response = authed_client.post("/api/v1/emergency-requests", json=_VALID_PAYLOAD)
        assert response.status_code == 201
        data = response.json()
        assert data["success"] is True
        assert data["data"]["status"] == "pending"

    def test_user_id_is_set_from_token_not_body(self, authed_client: TestClient) -> None:
        """Any user_id in the body must be rejected (extra=forbid)."""
        payload = {**_VALID_PAYLOAD, "user_id": "00000000-0000-0000-0000-000000000099"}
        response = authed_client.post("/api/v1/emergency-requests", json=payload)
        assert response.status_code == 422

    def test_rejects_client_provided_status(self, authed_client: TestClient) -> None:
        payload = {**_VALID_PAYLOAD, "status": "completed"}
        response = authed_client.post("/api/v1/emergency-requests", json=payload)
        assert response.status_code == 422

    def test_missing_location_and_address_fails(self, authed_client: TestClient) -> None:
        payload = {
            "emergency_type": "medical",
            "severity": "high",
            "description": "Patient needs urgent help right now please.",
            "contact_number": "+14155550100",
        }
        response = authed_client.post("/api/v1/emergency-requests", json=payload)
        assert response.status_code == 422

    def test_manual_address_accepted_without_gps(self, authed_client: TestClient) -> None:
        payload = {
            "emergency_type": "medical",
            "severity": "high",
            "description": "Patient needs urgent help right now please.",
            "contact_number": "+14155550100",
            "manual_address": "123 Main St, Springfield",
        }
        from app.schemas.database.emergency_request import EmergencyRequestRow
        row_data = {**_MOCK_ROW, "manual_address": "123 Main St, Springfield", "latitude": None, "longitude": None}
        row = EmergencyRequestRow.model_validate(row_data)
        with patch(
            "app.services.emergency_request_service.EmergencyRequestRepository.create",
            return_value=row,
        ):
            response = authed_client.post("/api/v1/emergency-requests", json=payload)
        assert response.status_code == 201

    def test_description_too_short_fails(self, authed_client: TestClient) -> None:
        payload = {**_VALID_PAYLOAD, "description": "short"}
        response = authed_client.post("/api/v1/emergency-requests", json=payload)
        assert response.status_code == 422

    def test_invalid_coordinates_fail(self, authed_client: TestClient) -> None:
        payload = {**_VALID_PAYLOAD, "latitude": 999.0}
        response = authed_client.post("/api/v1/emergency-requests", json=payload)
        assert response.status_code == 422


class TestListEmergencyRequests:
    def test_requires_auth(self, client: TestClient) -> None:
        response = client.get("/api/v1/emergency-requests")
        assert response.status_code == 401

    def test_returns_paginated_list(self, authed_client: TestClient) -> None:
        from app.schemas.database.emergency_request import EmergencyRequestRow
        row = EmergencyRequestRow.model_validate(_MOCK_ROW)
        with (
            patch(
                "app.repositories.emergency_requests.EmergencyRequestRepository.list_for_user",
                return_value=[row],
            ),
            patch(
                "app.repositories.emergency_requests.EmergencyRequestRepository.count_for_user",
                return_value=1,
            ),
        ):
            response = authed_client.get("/api/v1/emergency-requests")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "items" in data["data"]
        assert data["data"]["total"] == 1

    def test_only_own_requests_returned(self, authed_client: TestClient) -> None:
        """The list endpoint must always filter by the token user_id."""
        with (
            patch(
                "app.repositories.emergency_requests.EmergencyRequestRepository.list_for_user",
                return_value=[],
            ) as mock_list,
            patch(
                "app.repositories.emergency_requests.EmergencyRequestRepository.count_for_user",
                return_value=0,
            ),
        ):
            authed_client.get("/api/v1/emergency-requests")
            call_kwargs = mock_list.call_args
            assert call_kwargs.kwargs.get("user_id") == FAKE_USER_ID or call_kwargs.args[0] == FAKE_USER_ID


class TestGetEmergencyRequest:
    def test_requires_auth(self, client: TestClient) -> None:
        response = client.get("/api/v1/emergency-requests/some-id")
        assert response.status_code == 401

    def test_returns_own_request(self, authed_client: TestClient) -> None:
        from app.schemas.database.emergency_request import EmergencyRequestRow
        row = EmergencyRequestRow.model_validate(_MOCK_ROW)
        with patch(
            "app.repositories.emergency_requests.EmergencyRequestRepository.get_by_id",
            return_value=row,
        ):
            response = authed_client.get("/api/v1/emergency-requests/aaaaaaaa-0000-0000-0000-000000000001")
        assert response.status_code == 200

    def test_other_users_request_returns_404(self, authed_client: TestClient) -> None:
        """Returns 404 whether the request doesn't exist or belongs to someone else."""
        with patch(
            "app.repositories.emergency_requests.EmergencyRequestRepository.get_by_id",
            return_value=None,
        ):
            response = authed_client.get("/api/v1/emergency-requests/aaaaaaaa-0000-0000-0000-000000000099")
        assert response.status_code == 404

    def test_404_has_safe_message(self, authed_client: TestClient) -> None:
        with patch(
            "app.repositories.emergency_requests.EmergencyRequestRepository.get_by_id",
            return_value=None,
        ):
            response = authed_client.get("/api/v1/emergency-requests/missing-id")
        payload = response.json()
        assert payload.get("success") is False
        # Must not mention whether another user's request exists
        msg = payload.get("message", "")
        assert "another user" not in msg.lower()


_PATCH_USER_CLIENT = "app.api.v1.routes.emergency_requests.create_user_supabase_client"


class TestCancelEmergencyRequest:
    def test_requires_auth(self, client: TestClient) -> None:
        response = client.post("/api/v1/emergency-requests/some-id/cancel")
        assert response.status_code == 401

    def test_cancel_not_found_returns_404(self, authed_client: TestClient) -> None:
        from unittest.mock import MagicMock
        with (
            patch(_PATCH_USER_CLIENT, return_value=MagicMock()),
            patch(
                "app.services.emergency_request_service.EmergencyRequestRepository.get_by_id",
                return_value=None,
            ),
        ):
            response = authed_client.post(
                "/api/v1/emergency-requests/missing-id/cancel"
            )
        assert response.status_code == 404

    def test_cancel_terminal_request_returns_400(self, authed_client: TestClient) -> None:
        from unittest.mock import MagicMock
        from app.schemas.database.emergency_request import EmergencyRequestRow
        completed_row = {**_MOCK_ROW, "status": "completed"}
        row = EmergencyRequestRow.model_validate(completed_row)
        with (
            patch(_PATCH_USER_CLIENT, return_value=MagicMock()),
            patch(
                "app.services.emergency_request_service.EmergencyRequestRepository.get_by_id",
                return_value=row,
            ),
        ):
            response = authed_client.post(
                "/api/v1/emergency-requests/aaaaaaaa-0000-0000-0000-000000000001/cancel"
            )
        assert response.status_code == 400
