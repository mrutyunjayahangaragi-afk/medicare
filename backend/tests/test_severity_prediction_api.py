"""
tests/test_severity_prediction_api.py
API-level tests for the ML severity prediction endpoints.
"""

from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from tests.conftest import FAKE_USER_ID

_VALID_BODY = {
    "emergency_type": "medical",
    "description": "Patient has collapsed and is not responding to any stimuli.",
}


class TestPredictSeverityAuth:
    def test_missing_token_returns_401(self, client: TestClient) -> None:
        response = client.post("/api/v1/ml/severity/predict", json=_VALID_BODY)
        assert response.status_code == 401

    def test_invalid_token_returns_401(self, client: TestClient) -> None:
        response = client.post(
            "/api/v1/ml/severity/predict",
            json=_VALID_BODY,
            headers={"Authorization": "Bearer invalid-token"},
        )
        assert response.status_code == 401


class TestPredictSeverityValidation:
    def test_short_description_returns_422(self, authed_client: TestClient) -> None:
        response = authed_client.post(
            "/api/v1/ml/severity/predict",
            json={"emergency_type": "medical", "description": "short"},
        )
        assert response.status_code == 422

    def test_extra_fields_returns_422(self, authed_client: TestClient) -> None:
        response = authed_client.post(
            "/api/v1/ml/severity/predict",
            json={**_VALID_BODY, "user_id": "injected-id"},
        )
        assert response.status_code == 422

    def test_invalid_emergency_type_returns_422(self, authed_client: TestClient) -> None:
        response = authed_client.post(
            "/api/v1/ml/severity/predict",
            json={"emergency_type": "unknown_type", "description": "Some emergency situation."},
        )
        assert response.status_code == 422


class TestPredictSeveritySuccess:
    def test_returns_200_or_503(self, authed_client: TestClient) -> None:
        """When model is available returns 200; when not trained returns 503."""
        response = authed_client.post("/api/v1/ml/severity/predict", json=_VALID_BODY)
        assert response.status_code in (200, 503)

    def test_503_when_model_unavailable(self, authed_client: TestClient) -> None:
        from ml.severity.src.model_registry import ModelUnavailableError

        with patch(
            "app.services.severity_prediction_service.SeverityPredictionService.predict",
            side_effect=RuntimeError("Model unavailable"),
        ):
            response = authed_client.post("/api/v1/ml/severity/predict", json=_VALID_BODY)
        assert response.status_code == 503

    def test_200_with_mocked_model(self, authed_client: TestClient) -> None:
        from app.schemas.database.emergency_request import EmergencySeverity
        from app.schemas.severity_prediction import SeverityPredictionResponse

        mock_result = SeverityPredictionResponse(
            predicted_severity=EmergencySeverity.high,
            raw_model_severity=EmergencySeverity.high,
            confidence=0.82,
            model_version="severity-v1",
            important_factors=["Description text analysis"],
            safety_override_applied=False,
            safety_override_reason=None,
            low_confidence=False,
            disclaimer="Prototype model disclaimer.",
        )

        with patch(
            "app.services.severity_prediction_service.SeverityPredictionService.predict",
            return_value=mock_result,
        ):
            response = authed_client.post("/api/v1/ml/severity/predict", json=_VALID_BODY)

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["predicted_severity"] == "high"
        assert data["data"]["disclaimer"]


class TestModelInfoEndpoint:
    def test_requires_auth(self, client: TestClient) -> None:
        response = client.get("/api/v1/ml/severity/model-info")
        assert response.status_code == 401

    def test_returns_200_or_503(self, authed_client: TestClient) -> None:
        response = authed_client.get("/api/v1/ml/severity/model-info")
        assert response.status_code in (200, 503)

    def test_200_with_mocked_registry(self, authed_client: TestClient) -> None:
        mock_registry = MagicMock()
        mock_registry.version = "severity-v1"
        mock_registry.labels = ["low", "medium", "high", "critical"]
        mock_registry.confidence_threshold = 0.65
        mock_registry.safety_rules_version = "safety-v1"
        mock_registry.metadata = {"disclaimer": "test", "synthetic_data": True}

        # ModelRegistry is imported inside the route function — patch at source module
        with patch(
            "ml.severity.src.model_registry.ModelRegistry.get",
            return_value=mock_registry,
        ):
            response = authed_client.get("/api/v1/ml/severity/model-info")

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "severity-v1" in str(data["data"])


class TestSeverityHealthEndpoint:
    def test_requires_auth(self, client: TestClient) -> None:
        response = client.get("/api/v1/ml/severity/health")
        assert response.status_code == 401

    def test_returns_200_always(self, authed_client: TestClient) -> None:
        response = authed_client.get("/api/v1/ml/severity/health")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["status"] in ("ready", "not_ready", "disabled")
