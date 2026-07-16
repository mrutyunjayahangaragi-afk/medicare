"""
app/services/recommendation_service.py
Emergency Recommendation Engine.

Algorithm:
  Weighted score per candidate:
    40% Distance   (closer = higher score)
    30% Availability  (available = max, busy = half, offline = 0)
    20% Severity match  (type match = max)
    10% Capacity / responder type match

  ETA speeds (prototype):
    Ambulance/vehicle: 40 km/h
    Responder on foot: 35 km/h
    Walking fallback:   5 km/h

  Haversine formula for distance.
"""

from __future__ import annotations

import logging
import math
from typing import Any

from app.schemas.recommendation import (
    AmbulanceRecommendation,
    HospitalRecommendation,
    RecommendationRequest,
    RecommendationResponse,
    ResponderRecommendation,
)
from app.schemas.database.emergency_request import EmergencyType, EmergencySeverity
from app.repositories.base import BaseRepository

logger = logging.getLogger("medicare.services.recommendation")

# ── Speed constants (km/h) ────────────────────────────────────────────────
_AMBULANCE_SPEED_KMH = 40.0
_RESPONDER_SPEED_KMH = 35.0
_WALK_SPEED_KMH      =  5.0

# ── Score weights ─────────────────────────────────────────────────────────
_W_DISTANCE     = 0.40
_W_AVAILABILITY = 0.30
_W_SEVERITY     = 0.20
_W_CAPACITY     = 0.10

# ── Organization type → hospital type preference mapping ─────────────────
_TYPE_PREFERENCE: dict[str, list[str]] = {
    "medical":      ["hospital", "clinic"],
    "accident":     ["hospital", "ambulance_service"],
    "fire":         ["hospital"],
    "crime":        ["hospital", "government"],
    "flood":        ["hospital"],
    "electric":     ["hospital"],
    "child_safety": ["hospital"],
    "elder_care":   ["hospital", "clinic"],
    "animal_attack": ["hospital"],
    "other":        ["hospital"],
}


# ── Haversine distance ────────────────────────────────────────────────────

def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Return great-circle distance in km between two lat/lon points."""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlon / 2) ** 2
    )
    return R * 2 * math.asin(math.sqrt(a))


def _eta_minutes(distance_km: float, speed_kmh: float) -> int:
    """Return ETA in whole minutes."""
    if speed_kmh <= 0:
        return 999
    return max(1, round((distance_km / speed_kmh) * 60))


def _distance_score(distance_km: float, max_radius_km: float = 50.0) -> float:
    """Higher score for shorter distance. 0 beyond max_radius."""
    if distance_km >= max_radius_km:
        return 0.0
    return 1.0 - (distance_km / max_radius_km)


def _availability_score(status: str | None) -> float:
    mapping = {"available": 1.0, "busy": 0.5, "offline": 0.0}
    return mapping.get(status or "offline", 0.0)


def _type_match_score(org_type: str | None, emergency_type: str) -> float:
    preferred = _TYPE_PREFERENCE.get(emergency_type, ["hospital"])
    if org_type in preferred:
        idx = preferred.index(org_type)
        return 1.0 - idx * 0.2  # First preference = 1.0, second = 0.8, …
    return 0.5  # Any hospital is better than nothing


class RecommendationService(BaseRepository):
    """Generates best-hospital / ambulance / responder recommendations."""

    def recommend(self, req: RecommendationRequest) -> RecommendationResponse:
        hospital  = self._best_hospital(req)
        ambulance = self._best_ambulance(req)
        responder = self._best_responder(req)

        available = any(x is not None for x in [hospital, ambulance, responder])

        return RecommendationResponse(
            priority=req.severity,
            request_id=req.request_id,
            hospital=hospital,
            ambulance=ambulance,
            responder=responder,
            recommendation_available=available,
        )

    # ── Hospital ──────────────────────────────────────────────────────────

    def _best_hospital(self, req: RecommendationRequest) -> HospitalRecommendation | None:
        try:
            result = (
                self._admin()
                .table("organizations")
                .select("id, name, organization_type, phone, address, latitude, longitude")
                .eq("is_verified", True)
                .in_("organization_type", ["hospital", "clinic", "ambulance_service"])
                .execute()
            )
        except Exception as exc:
            logger.warning("Hospital query failed: %s", exc)
            return None

        rows: list[dict[str, Any]] = result.data or []
        candidates: list[tuple[float, dict]] = []

        for row in rows:
            lat = row.get("latitude")
            lon = row.get("longitude")
            if lat is None or lon is None:
                continue
            try:
                dist = haversine_km(req.latitude, req.longitude, float(lat), float(lon))
            except Exception:
                continue

            d_score  = _distance_score(dist)
            t_score  = _type_match_score(row.get("organization_type"), req.emergency_type.value)
            # Hospitals don't have availability status — assume available
            a_score  = 1.0
            capacity = 1.0  # No capacity data — treat equally

            score = (
                _W_DISTANCE     * d_score
                + _W_AVAILABILITY * a_score
                + _W_SEVERITY     * t_score
                + _W_CAPACITY     * capacity
            )
            candidates.append((score, {**row, "_dist": dist}))

        if not candidates:
            return None

        candidates.sort(key=lambda x: x[0], reverse=True)
        best_score, best = candidates[0]
        dist_km = best["_dist"]

        return HospitalRecommendation(
            id=str(best["id"]),
            name=str(best.get("name", "Hospital")),
            distance_km=round(dist_km, 2),
            eta_minutes=_eta_minutes(dist_km, _AMBULANCE_SPEED_KMH),
            address=best.get("address"),
            phone=best.get("phone"),
            organization_type=best.get("organization_type"),
            score=round(best_score, 3),
        )

    # ── Ambulance (responder with ambulance type) ─────────────────────────

    def _best_ambulance(self, req: RecommendationRequest) -> AmbulanceRecommendation | None:
        try:
            result = (
                self._admin()
                .table("profiles")
                .select("id, full_name, phone, availability_status, responder_type, organization_id")
                .in_("role", ["responder", "volunteer", "hospital_staff", "hospital"])
                .eq("responder_type", "ambulance")
                .in_("availability_status", ["available", "busy"])
                .execute()
            )
        except Exception as exc:
            logger.warning("Ambulance query failed: %s", exc)
            return None

        # For ambulance, we need location — use responder_locations latest entries
        rows: list[dict[str, Any]] = result.data or []
        if not rows:
            return None

        candidates = self._score_responders(rows, req, _AMBULANCE_SPEED_KMH)
        if not candidates:
            return None

        best_score, best_row, dist_km = candidates[0]
        return AmbulanceRecommendation(
            id=str(best_row["id"]),
            name=str(best_row.get("full_name") or "Ambulance"),
            distance_km=round(dist_km, 2),
            eta_minutes=_eta_minutes(dist_km, _AMBULANCE_SPEED_KMH),
            phone=best_row.get("phone"),
            availability_status=best_row.get("availability_status"),
            score=round(best_score, 3),
        )

    # ── Responder ─────────────────────────────────────────────────────────

    def _best_responder(self, req: RecommendationRequest) -> ResponderRecommendation | None:
        try:
            result = (
                self._admin()
                .table("profiles")
                .select("id, full_name, phone, availability_status, responder_type")
                .in_("role", ["responder", "volunteer", "hospital_staff"])
                .eq("availability_status", "available")
                .execute()
            )
        except Exception as exc:
            logger.warning("Responder query failed: %s", exc)
            return None

        rows: list[dict[str, Any]] = result.data or []
        if not rows:
            return None

        candidates = self._score_responders(rows, req, _RESPONDER_SPEED_KMH)
        if not candidates:
            return None

        best_score, best_row, dist_km = candidates[0]
        return ResponderRecommendation(
            id=str(best_row["id"]),
            name=str(best_row.get("full_name") or "Responder"),
            distance_km=round(dist_km, 2),
            eta_minutes=_eta_minutes(dist_km, _RESPONDER_SPEED_KMH),
            phone=best_row.get("phone"),
            responder_type=best_row.get("responder_type"),
            score=round(best_score, 3),
        )

    # ── Shared responder scoring ──────────────────────────────────────────

    def _score_responders(
        self,
        rows: list[dict[str, Any]],
        req: RecommendationRequest,
        speed_kmh: float,
    ) -> list[tuple[float, dict, float]]:
        """Return sorted (score, row, distance_km) list."""
        # Fetch latest known locations for these responder IDs
        ids = [str(r["id"]) for r in rows]
        location_map: dict[str, tuple[float, float]] = {}
        try:
            loc_result = (
                self._admin()
                .table("responder_locations")
                .select("responder_id, latitude, longitude")
                .in_("responder_id", ids)
                .execute()
            )
            for loc in (loc_result.data or []):
                rid = str(loc["responder_id"])
                try:
                    location_map[rid] = (float(loc["latitude"]), float(loc["longitude"]))
                except (TypeError, ValueError):
                    pass
        except Exception as exc:
            logger.debug("Responder location query failed: %s", exc)

        candidates: list[tuple[float, dict, float]] = []
        for row in rows:
            rid = str(row["id"])
            loc = location_map.get(rid)
            if loc is None:
                # No known location — use a large default distance
                dist = 25.0
            else:
                try:
                    dist = haversine_km(req.latitude, req.longitude, loc[0], loc[1])
                except Exception:
                    dist = 25.0

            d_score = _distance_score(dist)
            a_score = _availability_score(row.get("availability_status"))

            # Severity boost: critical/high emergencies prefer paramedic/doctor/nurse
            sev_score = 0.7
            rtype = str(row.get("responder_type") or "")
            if req.severity in (EmergencySeverity.critical, EmergencySeverity.high):
                if rtype in ("paramedic", "doctor", "nurse"):
                    sev_score = 1.0
            else:
                sev_score = 0.8

            score = (
                _W_DISTANCE     * d_score
                + _W_AVAILABILITY * a_score
                + _W_SEVERITY     * sev_score
                + _W_CAPACITY     * 1.0
            )
            candidates.append((score, row, dist))

        candidates.sort(key=lambda x: x[0], reverse=True)
        return candidates
