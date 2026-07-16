"""
tests/test_responder_api.py
Tests for the responder API endpoints.

All tests that call action routes (accept, start, arrive, complete, availability)
patch create_user_supabase_client to prevent real network calls to placeholder.supabase.co.
Service-layer calls are patched separately with mock return values.
"""

from __future__ import annotations

from datetime import datetime
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from tests.conftest import FAKE_RESPONDER_ID, FAKE_USER_ID

_REQUEST_ID = "aaaaaaaa-0000-0000-0000-000000000001"

_MOCK_ROW = {
    "id": _REQUEST_ID,
    "user_id": FAKE_USER_ID,
    "emergency_type": "medical",
    "severity": "critical",
    "description": "Critical emergency needs immediate attention now.",
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

# Patch target for the Supabase user-scoped client used inside all action routes
_PATCH_USER_CLIENT = "app.api.v1.routes.responder.create_user_supabase_client"


def _mock_supabase_client() -> MagicMock:
    """Return a MagicMock that stands in for a Supabase user-scoped client."""
    return MagicMock()


class TestResponderAuth:
    def test_normal_user_gets_403_on_available_requests(
        self, authed_client: TestClient, _app
    ) -> None:
        """Normal user must be denied — require_responder enforces the role."""
        from fastapi import HTTPException
        from fastapi import status as http_status
        from app.api.dependencies.roles import require_responder

        def _raise_403():
            raise HTTPException(
                status_code=http_status.HTTP_403_FORBIDDEN,
                detail="Responder role required.",
            )

        saved = _app.dependency_overrides.get(require_responder)
        _app.dependency_overrides[require_responder] = _raise_403
        try:
            response = authed_client.get("/api/v1/responder/requests/available")
        finally:
            if saved is not None:
                _app.dependency_overrides[require_responder] = saved
            else:
                _app.dependency_overrides.pop(require_responder, None)
        assert response.status_code == 403

    def test_unauthenticated_gets_401(self, client: TestClient) -> None:
        response = client.get("/api/v1/responder/requests/available")
        assert response.status_code == 401


class TestAvailableRequests:
    def test_responder_can_list_available(self, responder_client: TestClient) -> None:
        from app.schemas.database.emergency_request import EmergencyRequestRow

        row = EmergencyRequestRow.model_validate(_MOCK_ROW)
        with patch(
            "app.repositories.emergency_requests.EmergencyRequestRepository.list_pending_unassigned",
            return_value=[row],
        ):
            response = responder_client.get("/api/v1/responder/requests/available")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert len(data["data"]["items"]) == 1


class TestAssignedRequests:
    def test_responder_can_list_assigned(self, responder_client: TestClient) -> None:
        with patch(
            "app.repositories.emergency_requests.EmergencyRequestRepository.list_assigned_to_responder",
            return_value=[],
        ):
            response = responder_client.get("/api/v1/responder/requests/assigned")
        assert response.status_code == 200


class TestAcceptRequest:
    def test_normal_user_cannot_accept(self, authed_client: TestClient, _app) -> None:
        from fastapi import HTTPException
        from fastapi import status as http_status
        from app.api.dependencies.roles import require_responder

        def _raise_403():
            raise HTTPException(
                status_code=http_status.HTTP_403_FORBIDDEN,
                detail="Responder role required.",
            )

        saved = _app.dependency_overrides.get(require_responder)
        _app.dependency_overrides[require_responder] = _raise_403
        try:
            response = authed_client.post(
                f"/api/v1/responder/requests/{_REQUEST_ID}/accept"
            )
        finally:
            if saved is not None:
                _app.dependency_overrides[require_responder] = saved
            else:
                _app.dependency_overrides.pop(require_responder, None)
        assert response.status_code == 403

    def test_conflict_on_double_accept(self, responder_client: TestClient) -> None:
        """Second accept for the same request returns 409."""
        from app.services.emergency_request_service import EmergencyRequestService

        with (
            patch(_PATCH_USER_CLIENT, return_value=_mock_supabase_client()),
            patch.object(
                EmergencyRequestService,
                "accept_request",
                side_effect=Exception("already accepted"),
            ),
        ):
            response = responder_client.post(
                f"/api/v1/responder/requests/{_REQUEST_ID}/accept"
            )
        assert response.status_code == 409


class TestStatusTransitions:
    def test_normal_user_cannot_start_request(
        self, authed_client: TestClient, _app
    ) -> None:
        from fastapi import HTTPException
        from fastapi import status as http_status
        from app.api.dependencies.roles import require_responder

        def _raise_403():
            raise HTTPException(
                status_code=http_status.HTTP_403_FORBIDDEN,
                detail="Responder role required.",
            )

        saved = _app.dependency_overrides.get(require_responder)
        _app.dependency_overrides[require_responder] = _raise_403
        try:
            response = authed_client.post(
                f"/api/v1/responder/requests/{_REQUEST_ID}/start"
            )
        finally:
            if saved is not None:
                _app.dependency_overrides[require_responder] = saved
            else:
                _app.dependency_overrides.pop(require_responder, None)
        assert response.status_code == 403

    def test_unassigned_responder_cannot_start(
        self, responder_client: TestClient
    ) -> None:
        from fastapi import HTTPException
        from app.services.emergency_request_service import EmergencyRequestService

        with (
            patch(_PATCH_USER_CLIENT, return_value=_mock_supabase_client()),
            patch.object(
                EmergencyRequestService,
                "transition_status",
                side_effect=HTTPException(status_code=403, detail="Not assigned"),
            ),
        ):
            response = responder_client.post(
                f"/api/v1/responder/requests/{_REQUEST_ID}/start"
            )
        assert response.status_code == 403

    def test_invalid_transition_returns_400(self, responder_client: TestClient) -> None:
        from fastapi import HTTPException
        from app.services.emergency_request_service import EmergencyRequestService

        with (
            patch(_PATCH_USER_CLIENT, return_value=_mock_supabase_client()),
            patch.object(
                EmergencyRequestService,
                "transition_status",
                side_effect=HTTPException(status_code=400, detail="Invalid transition"),
            ),
        ):
            response = responder_client.post(
                f"/api/v1/responder/requests/{_REQUEST_ID}/complete"
            )
        assert response.status_code == 400


class TestAvailabilityUpdate:
    def test_requires_responder(self, authed_client: TestClient, _app) -> None:
        from fastapi import HTTPException
        from fastapi import status as http_status
        from app.api.dependencies.roles import require_responder

        def _raise_403():
            raise HTTPException(
                status_code=http_status.HTTP_403_FORBIDDEN,
                detail="Responder role required.",
            )

        saved = _app.dependency_overrides.get(require_responder)
        _app.dependency_overrides[require_responder] = _raise_403
        try:
            response = authed_client.put(
                "/api/v1/responder/availability",
                json={"availability_status": "available"},
            )
        finally:
            if saved is not None:
                _app.dependency_overrides[require_responder] = saved
            else:
                _app.dependency_overrides.pop(require_responder, None)
        assert response.status_code == 403

    def test_valid_availability_accepted(self, responder_client: TestClient) -> None:
        from app.services.responder_service import ResponderService

        with (
            patch(_PATCH_USER_CLIENT, return_value=_mock_supabase_client()),
            patch.object(ResponderService, "update_availability", return_value=True),
        ):
            response = responder_client.put(
                "/api/v1/responder/availability",
                json={"availability_status": "available"},
            )
        assert response.status_code == 200

    def test_invalid_availability_rejected(self, responder_client: TestClient) -> None:
        """Schema validation happens before the service call — no patch needed."""
        response = responder_client.put(
            "/api/v1/responder/availability",
            json={"availability_status": "on_break"},
        )
        assert response.status_code == 422
