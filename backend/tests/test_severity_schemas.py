"""
tests/test_severity_schemas.py
Pydantic schema validation tests for severity prediction.
"""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from app.schemas.severity_prediction import SeverityPredictionRequest


class TestSeverityPredictionRequest:
    def test_valid_minimal_request(self) -> None:
        req = SeverityPredictionRequest(
            emergency_type="medical",
            description="Patient is unresponsive and not breathing normally.",
        )
        assert req.emergency_type.value == "medical"
        assert req.age_group.value == "unknown"
        assert req.conscious is None

    def test_valid_full_request(self) -> None:
        req = SeverityPredictionRequest(
            emergency_type="accident",
            description="Major car crash with severe head injury, unconscious.",
            age_group="adult",
            conscious=False,
            breathing_difficulty=True,
            severe_breathing_difficulty=True,
            bleeding_level="severe",
            major_accident=True,
        )
        assert req.major_accident is True
        assert req.bleeding_level.value == "severe"

    def test_short_description_rejected(self) -> None:
        with pytest.raises(ValidationError) as exc_info:
            SeverityPredictionRequest(
                emergency_type="medical",
                description="Hurt",
            )
        errors = exc_info.value.errors()
        assert any("description" in str(e["loc"]) for e in errors)

    def test_description_below_10_chars_rejected(self) -> None:
        with pytest.raises(ValidationError):
            SeverityPredictionRequest(
                emergency_type="fire",
                description="123456789",  # 9 chars
            )

    def test_description_at_exactly_10_chars_accepted(self) -> None:
        req = SeverityPredictionRequest(
            emergency_type="fire",
            description="1234567890",
        )
        assert len(req.description) == 10

    def test_invalid_emergency_type_rejected(self) -> None:
        with pytest.raises(ValidationError):
            SeverityPredictionRequest(
                emergency_type="zombie_attack",  # type: ignore[arg-type]
                description="Someone is being attacked by zombies.",
            )

    def test_extra_fields_rejected(self) -> None:
        with pytest.raises(ValidationError):
            SeverityPredictionRequest(
                emergency_type="medical",
                description="Patient collapsed on the floor suddenly.",
                user_id="should-be-rejected",  # type: ignore[call-arg]
            )

    def test_valid_bleeding_levels(self) -> None:
        for level in ["none", "minor", "moderate", "severe"]:
            req = SeverityPredictionRequest(
                emergency_type="medical",
                description="Emergency situation requiring immediate attention.",
                bleeding_level=level,  # type: ignore[arg-type]
            )
            assert req.bleeding_level.value == level

    def test_invalid_bleeding_level_rejected(self) -> None:
        with pytest.raises(ValidationError):
            SeverityPredictionRequest(
                emergency_type="medical",
                description="Emergency situation requiring immediate attention.",
                bleeding_level="extreme",  # type: ignore[arg-type]
            )

    def test_valid_burn_levels(self) -> None:
        for level in ["none", "minor", "moderate", "severe"]:
            req = SeverityPredictionRequest(
                emergency_type="fire",
                description="Person caught in fire with burn injuries.",
                burn_level=level,  # type: ignore[arg-type]
            )
            assert req.burn_level.value == level

    def test_description_max_1000_chars_accepted(self) -> None:
        req = SeverityPredictionRequest(
            emergency_type="medical",
            description="A" * 1000,
        )
        assert len(req.description) == 1000

    def test_description_over_1000_chars_rejected(self) -> None:
        with pytest.raises(ValidationError):
            SeverityPredictionRequest(
                emergency_type="medical",
                description="A" * 1001,
            )
