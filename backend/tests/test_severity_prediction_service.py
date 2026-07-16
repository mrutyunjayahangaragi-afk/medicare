"""
tests/test_severity_prediction_service.py
SeverityPredictionService unit tests with mocked model.
"""

from __future__ import annotations

from unittest.mock import MagicMock, patch
from uuid import UUID

import pytest

from app.schemas.severity_prediction import SeverityPredictionRequest

_VALID_PAYLOAD = SeverityPredictionRequest(
    emergency_type="medical",
    description="Patient has collapsed and is not responding to stimuli.",
)

_FAKE_USER_ID = UUID("00000000-0000-0000-0000-000000000001")


def _make_mock_registry(raw_severity: str = "high", confidence: float = 0.82) -> MagicMock:
    registry = MagicMock()
    registry.version = "severity-v1"
    registry.labels = ["low", "medium", "high", "critical"]
    registry.confidence_threshold = 0.65
    registry.safety_rules_version = "safety-v1"
    registry.model.predict.return_value = (raw_severity, confidence)
    registry.metadata = {
        "model_version": "severity-v1",
        "labels": ["low", "medium", "high", "critical"],
        "confidence_threshold": 0.65,
        "safety_rules_version": "safety-v1",
    }
    return registry


class TestSeverityPredictionService:
    def _run(
        self,
        payload: SeverityPredictionRequest = _VALID_PAYLOAD,
        raw_severity: str = "high",
        confidence: float = 0.82,
        confidence_threshold: float = 0.65,
    ):
        from app.services.severity_prediction_service import SeverityPredictionService

        mock_registry = _make_mock_registry(raw_severity, confidence)

        with patch(
            "app.services.severity_prediction_service.SeverityPredictionService.predict",
        ) as _:
            pass  # We'll call directly with registry patched

        with patch(
            "ml.severity.src.model_registry.ModelRegistry.get",
            return_value=mock_registry,
        ):
            service = SeverityPredictionService()
            return service.predict(payload, _FAKE_USER_ID, confidence_threshold)

    def test_valid_input_returns_prediction(self) -> None:
        result = self._run()
        assert result is not None
        assert result.predicted_severity is not None

    def test_confidence_in_range(self) -> None:
        result = self._run(confidence=0.75)
        assert result.confidence is not None
        assert 0.0 <= result.confidence <= 1.0

    def test_labels_from_allowed_set(self) -> None:
        allowed = {"low", "medium", "high", "critical"}
        for sev in ["low", "medium", "high", "critical"]:
            result = self._run(raw_severity=sev)
            assert result.predicted_severity.value in allowed
            assert result.raw_model_severity.value in allowed

    def test_safety_override_reflected(self) -> None:
        payload = SeverityPredictionRequest(
            emergency_type="medical",
            description="Patient is unconscious with severe difficulty breathing.",
            severe_breathing_difficulty=True,
        )
        result = self._run(payload=payload, raw_severity="low", confidence=0.90)
        # Safety rule must elevate to critical
        assert result.predicted_severity.value == "critical"
        assert result.safety_override_applied is True

    def test_safety_override_not_applied_for_normal_case(self) -> None:
        result = self._run(raw_severity="medium", confidence=0.90)
        assert result.safety_override_applied is False

    def test_disclaimer_always_present(self) -> None:
        result = self._run()
        assert result.disclaimer
        assert len(result.disclaimer) > 10

    def test_low_confidence_flag_set(self) -> None:
        result = self._run(confidence=0.40, confidence_threshold=0.65)
        assert result.low_confidence is True

    def test_high_confidence_flag_not_set(self) -> None:
        result = self._run(confidence=0.90, confidence_threshold=0.65)
        assert result.low_confidence is False

    def test_model_version_in_response(self) -> None:
        result = self._run()
        assert result.model_version == "severity-v1"

    def test_important_factors_list(self) -> None:
        result = self._run()
        assert isinstance(result.important_factors, list)
        assert len(result.important_factors) >= 1
