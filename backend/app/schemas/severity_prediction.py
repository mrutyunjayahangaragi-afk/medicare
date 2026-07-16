"""
app/schemas/severity_prediction.py
Pydantic schemas for the ML severity prediction API.
"""

from __future__ import annotations

from enum import Enum

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.database.emergency_request import EmergencySeverity, EmergencyType


class AgeGroup(str, Enum):
    child = "child"
    adult = "adult"
    senior = "senior"
    unknown = "unknown"


class BleedingLevel(str, Enum):
    none = "none"
    minor = "minor"
    moderate = "moderate"
    severe = "severe"


class BurnLevel(str, Enum):
    none = "none"
    minor = "minor"
    moderate = "moderate"
    severe = "severe"


class SeverityPredictionRequest(BaseModel):
    """Input payload for severity prediction.

    All risk indicator fields are optional — the model degrades gracefully
    when only description + emergency_type are provided.
    """

    emergency_type: EmergencyType
    description: str = Field(min_length=10, max_length=1000)

    # Optional enrichment fields
    age_group: AgeGroup = AgeGroup.unknown
    conscious: bool | None = None
    breathing_difficulty: bool | None = None
    severe_breathing_difficulty: bool | None = None
    bleeding_level: BleedingLevel | None = None
    chest_pain: bool | None = None
    seizure: bool | None = None
    stroke_signs: bool | None = None
    burn_level: BurnLevel | None = None
    allergic_reaction: bool | None = None
    pregnancy_emergency: bool | None = None
    major_accident: bool | None = None
    violence_risk: bool | None = None

    model_config = ConfigDict(extra="forbid")


class SeverityPredictionResponse(BaseModel):
    """Severity prediction result.

    predicted_severity: final severity after safety rules (always ≥ raw model)
    raw_model_severity: unmodified model output (informational)
    confidence: prediction confidence ∈ [0, 1], None if unavailable
    model_version: artifact version string
    important_factors: top contributing factors for the prediction
    safety_override_applied: True if a safety rule raised the severity
    safety_override_reason: Human-readable override reason (if applicable)
    low_confidence: True when confidence < configured threshold
    disclaimer: Always-present prototype disclaimer
    """

    predicted_severity: EmergencySeverity
    raw_model_severity: EmergencySeverity
    confidence: float | None
    model_version: str
    important_factors: list[str]
    safety_override_applied: bool
    safety_override_reason: str | None
    low_confidence: bool
    disclaimer: str
