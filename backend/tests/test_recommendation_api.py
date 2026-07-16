"""
tests/test_recommendation_api.py
API-level tests for the recommendation engine endpoint.
"""

from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from tests.conftest import FAKE_USER_ID

_VALID_BODY = {
    "request_id": "aaaaaaaa-0000-0000-0000-000000000001",
    "severity": "high",
    "latitude": 37.7749,
    "longitude": -122.4194,
    "emergency_type": "medical",
}


class TestRecommendationAuth:
    def test_missing_token_returns_401(self, client: TestClient) -> None:
        response = client.post("/api/v1/recommendations", json=_VALID_BODY)
        assert response.status_code == 401

    def test_invalid_token_returns_401(self, client: TestClient) -> None:
        response = client.post(
            "/api/v1/recommendations",
            json=_VALID_BODY,
            headers={"Authorization": "Bearer bad-token"},
        )
        assert response.status_code == 401


class TestRecommendationValidation:
    def test_invalid_coordinates_rejected(self, authed_client: TestClient) -> None:
        body = {**_VALID_BODY, "latitude": 999.0}
        response = authed_client.post("/api/v1/recommendations", json=body)
        assert response.status_code == 422

    def test_invalid_severity_rejected(self, authed_client: TestClient) -> None:
        body = {**_VALID_BODY, "severity": "apocalyptic"}
        response = authed_client.post("/api/v1/recommendations", json=body)
        assert response.status_code == 422

    def test_invalid_emergency_type_rejected(self, authed_client: TestClient) -> None:
        body = {**_VALID_BODY, "emergency_type": "alien_attack"}
        response = authed_client.post("/api/v1/recommendations", json=body)
        assert response.status_code == 422

    def test_extra_fields_rejected(self, authed_client: TestClient) -> None:
        body = {**_VALID_BODY, "user_id": FAKE_USER_ID}
        response = authed_client.post("/api/v1/recommendations", json=body)
        assert response.status_code == 422


class TestRecommendationSuccess:
    def test_returns_200_with_empty_results(self, authed_client: TestClient) -> None:
        """When no hospitals/responders in DB, returns 200 with no recommendations."""
        from app.services.recommendation_service import RecommendationService
        from app.schemas.recommendation import RecommendationResponse
        from app.schemas.database.emergency_request import EmergencySeverity

        mock_result = RecommendationResponse(
            priority=EmergencySeverity.high,
            request_id=_VALID_BODY["request_id"],
            hospital=None,
            ambulance=None,
            responder=None,
            recommendation_available=False,
        )

        with patch.object(RecommendationService, "recommend", return_value=mock_result):
            response = authed_client.post("/api/v1/recommendations", json=_VALID_BODY)

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["recommendation_available"] is False

    def test_returns_hospital_when_available(self, authed_client: TestClient) -> None:
        from app.services.recommendation_service import RecommendationService
        from app.schemas.recommendation import (
            HospitalRecommendation, RecommendationResponse,
        )
        from app.schemas.database.emergency_request import EmergencySeverity

        hospital = HospitalRecommendation(
            id="00000000-0000-0000-0000-000000000099",
            name="City General Hospital",
            distance_km=2.4,
            eta_minutes=4,
            score=0.85,
        )
        mock_result = RecommendationResponse(
            priority=EmergencySeverity.high,
            request_id=_VALID_BODY["request_id"],
            hospital=hospital,
            ambulance=None,
            responder=None,
            recommendation_available=True,
        )

        with patch.object(RecommendationService, "recommend", return_value=mock_result):
            response = authed_client.post("/api/v1/recommendations", json=_VALID_BODY)

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["recommendation_available"] is True
        assert data["data"]["hospital"]["name"] == "City General Hospital"
        assert data["data"]["hospital"]["distance_km"] == 2.4
        assert data["data"]["hospital"]["eta_minutes"] == 4

    def test_disclaimer_always_present(self, authed_client: TestClient) -> None:
        from app.services.recommendation_service import RecommendationService
        from app.schemas.recommendation import RecommendationResponse
        from app.schemas.database.emergency_request import EmergencySeverity

        mock_result = RecommendationResponse(
            priority=EmergencySeverity.medium,
            request_id=_VALID_BODY["request_id"],
            recommendation_available=False,
        )

        with patch.object(RecommendationService, "recommend", return_value=mock_result):
            response = authed_client.post("/api/v1/recommendations", json=_VALID_BODY)

        assert response.status_code == 200
        assert response.json()["data"]["disclaimer"]

    def test_critical_returns_correct_priority(self, authed_client: TestClient) -> None:
        from app.services.recommendation_service import RecommendationService
        from app.schemas.recommendation import RecommendationResponse
        from app.schemas.database.emergency_request import EmergencySeverity

        mock_result = RecommendationResponse(
            priority=EmergencySeverity.critical,
            request_id="aaaaaaaa-0000-0000-0000-000000000001",
            recommendation_available=False,
        )

        body = {**_VALID_BODY, "severity": "critical"}
        with patch.object(RecommendationService, "recommend", return_value=mock_result):
            response = authed_client.post("/api/v1/recommendations", json=body)

        assert response.status_code == 200
        assert response.json()["data"]["priority"] == "critical"


class TestHaversineFormula:
    def test_same_point_is_zero(self) -> None:
        from app.services.recommendation_service import haversine_km
        assert haversine_km(37.7749, -122.4194, 37.7749, -122.4194) == 0.0

    def test_known_distance(self) -> None:
        from app.services.recommendation_service import haversine_km
        # SF to LA is roughly 559 km
        dist = haversine_km(37.7749, -122.4194, 34.0522, -118.2437)
        assert 550 < dist < 570

    def test_eta_minutes_formula(self) -> None:
        from app.services.recommendation_service import _eta_minutes
        # 40 km at 40 km/h = 60 min
        assert _eta_minutes(40.0, 40.0) == 60
        # 10 km at 40 km/h = 15 min
        assert _eta_minutes(10.0, 40.0) == 15
        # Minimum 1 minute
        assert _eta_minutes(0.0, 40.0) == 1
