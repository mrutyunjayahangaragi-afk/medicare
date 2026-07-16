"""
tests/test_severity_safety_rules.py
Deterministic safety override engine tests.
"""

from __future__ import annotations

import pytest

from ml.severity.src.safety_rules import (
    SEVERITY_RANK,
    RANK_SEVERITY,
    SafetyOverrideResult,
    apply_safety_rules,
)


def _empty_indicators() -> dict:
    """All-safe baseline: person is conscious, no dangerous indicators."""
    return {
        "severe_breathing_difficulty": False,
        "breathing_difficulty": False,
        "conscious": False,   # False = NOT unconscious = person IS conscious = safe
        "bleeding_level": "none",
        "burn_level": "none",
        "chest_pain": False,
        "seizure": False,
        "stroke_signs": False,
        "allergic_reaction": False,
        "pregnancy_emergency": False,
        "major_accident": False,
        "violence_risk": False,
    }


class TestSeverityRankOrdering:
    def test_rank_map_correct(self) -> None:
        assert SEVERITY_RANK["low"] == 0
        assert SEVERITY_RANK["medium"] == 1
        assert SEVERITY_RANK["high"] == 2
        assert SEVERITY_RANK["critical"] == 3

    def test_reverse_map_correct(self) -> None:
        assert RANK_SEVERITY[0] == "low"
        assert RANK_SEVERITY[3] == "critical"

    def test_low_is_lowest(self) -> None:
        assert SEVERITY_RANK["low"] < SEVERITY_RANK["medium"]

    def test_critical_is_highest(self) -> None:
        assert SEVERITY_RANK["critical"] > SEVERITY_RANK["high"]


class TestNoOverride:
    def test_no_indicators_no_override(self) -> None:
        result = apply_safety_rules("medium", _empty_indicators())
        assert result.override_applied is False
        assert result.final_severity == "medium"
        assert result.override_reason is None

    def test_override_cannot_lower_severity(self) -> None:
        # Even with no dangerous indicators, critical stays critical
        indicators = _empty_indicators()
        result = apply_safety_rules("critical", indicators)
        assert result.final_severity == "critical"
        assert result.override_applied is False


class TestCriticalOverrides:
    def test_severe_breathing_difficulty_raises_to_critical(self) -> None:
        indicators = {**_empty_indicators(), "severe_breathing_difficulty": True}
        result = apply_safety_rules("low", indicators)
        assert result.final_severity == "critical"
        assert result.override_applied is True

    def test_severe_breathing_difficulty_from_medium_raises_to_critical(self) -> None:
        indicators = {**_empty_indicators(), "severe_breathing_difficulty": True}
        result = apply_safety_rules("medium", indicators)
        assert result.final_severity == "critical"

    def test_unconscious_with_breathing_difficulty_raises_to_critical(self) -> None:
        # conscious=True in the indicators dict means "is unconscious" = True
        indicators = {
            **_empty_indicators(),
            "conscious": True,    # True = person IS unconscious (dangerous)
            "breathing_difficulty": True,
        }
        result = apply_safety_rules("low", indicators)
        assert result.final_severity == "critical"
        assert result.override_applied is True

    def test_severe_bleeding_raises_to_critical(self) -> None:
        indicators = {**_empty_indicators(), "bleeding_level": "severe"}
        result = apply_safety_rules("low", indicators)
        assert result.final_severity == "critical"
        assert result.override_applied is True

    def test_severe_burn_raises_to_critical(self) -> None:
        indicators = {**_empty_indicators(), "burn_level": "severe"}
        result = apply_safety_rules("medium", indicators)
        assert result.final_severity == "critical"

    def test_major_accident_unconscious_raises_to_critical(self) -> None:
        # conscious=True means person IS unconscious
        indicators = {
            **_empty_indicators(),
            "major_accident": True,
            "conscious": True,    # True = person IS unconscious
        }
        result = apply_safety_rules("high", indicators)
        assert result.final_severity == "critical"

    def test_anaphylaxis_combination_raises_to_critical(self) -> None:
        indicators = {
            **_empty_indicators(),
            "allergic_reaction": True,
            "severe_breathing_difficulty": True,
        }
        result = apply_safety_rules("low", indicators)
        assert result.final_severity == "critical"


class TestHighOverrides:
    def test_stroke_signs_minimum_high(self) -> None:
        indicators = {**_empty_indicators(), "stroke_signs": True}
        result = apply_safety_rules("low", indicators)
        assert result.final_severity == "high"
        assert result.override_applied is True

    def test_stroke_signs_does_not_lower_critical(self) -> None:
        indicators = {**_empty_indicators(), "stroke_signs": True}
        result = apply_safety_rules("critical", indicators)
        assert result.final_severity == "critical"

    def test_seizure_minimum_high(self) -> None:
        indicators = {**_empty_indicators(), "seizure": True}
        result = apply_safety_rules("low", indicators)
        assert result.final_severity == "high"

    def test_chest_pain_minimum_high(self) -> None:
        indicators = {**_empty_indicators(), "chest_pain": True}
        result = apply_safety_rules("medium", indicators)
        assert result.final_severity == "high"

    def test_major_accident_minimum_high(self) -> None:
        indicators = {**_empty_indicators(), "major_accident": True}
        result = apply_safety_rules("low", indicators)
        assert result.final_severity == "high"

    def test_violence_risk_minimum_high(self) -> None:
        indicators = {**_empty_indicators(), "violence_risk": True}
        result = apply_safety_rules("low", indicators)
        assert result.final_severity == "high"

    def test_moderate_burn_minimum_high(self) -> None:
        indicators = {**_empty_indicators(), "burn_level": "moderate"}
        result = apply_safety_rules("low", indicators)
        assert result.final_severity == "high"

    def test_pregnancy_emergency_minimum_high(self) -> None:
        indicators = {**_empty_indicators(), "pregnancy_emergency": True}
        result = apply_safety_rules("low", indicators)
        assert result.final_severity == "high"

    def test_high_not_raised_to_critical_by_stroke_alone(self) -> None:
        indicators = {**_empty_indicators(), "stroke_signs": True}
        result = apply_safety_rules("high", indicators)
        assert result.final_severity == "high"
        assert result.override_applied is False


class TestOverrideReasonText:
    def test_override_reason_present_when_applied(self) -> None:
        indicators = {**_empty_indicators(), "severe_breathing_difficulty": True}
        result = apply_safety_rules("low", indicators)
        assert result.override_reason is not None
        assert len(result.override_reason) > 0

    def test_override_reason_none_when_not_applied(self) -> None:
        result = apply_safety_rules("high", _empty_indicators())
        assert result.override_reason is None
