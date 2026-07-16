"""
app/schemas/recommendation.py
Pydantic schemas for the Emergency Recommendation Engine.
"""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.database.emergency_request import EmergencyType, EmergencySeverity


# ── Request ───────────────────────────────────────────────────────────────

class RecommendationRequest(BaseModel):
    """Input for generating emergency service recommendations."""

    request_id: str = Field(description="UUID of the emergency request")
    severity: EmergencySeverity
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    emergency_type: EmergencyType

    model_config = ConfigDict(extra="forbid")


# ── Sub-response models ───────────────────────────────────────────────────

class HospitalRecommendation(BaseModel):
    id: str
    name: str
    distance_km: float
    eta_minutes: int
    address: str | None = None
    phone: str | None = None
    organization_type: str | None = None
    score: float


class AmbulanceRecommendation(BaseModel):
    id: str
    name: str
    distance_km: float
    eta_minutes: int
    phone: str | None = None
    availability_status: str | None = None
    score: float


class ResponderRecommendation(BaseModel):
    id: str
    name: str
    distance_km: float
    eta_minutes: int
    phone: str | None = None
    responder_type: str | None = None
    score: float


# ── Top-level response ────────────────────────────────────────────────────

class RecommendationResponse(BaseModel):
    """Full recommendation result for an emergency request."""

    priority: EmergencySeverity
    request_id: str
    hospital: HospitalRecommendation | None = None
    ambulance: AmbulanceRecommendation | None = None
    responder: ResponderRecommendation | None = None
    recommendation_available: bool
    disclaimer: str = "Recommendations are based on distance and availability. Always contact emergency services directly."
