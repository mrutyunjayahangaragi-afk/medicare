"""
app/api/v1/routes/recommendation.py
Emergency Recommendation Engine API.

POST /api/v1/recommendations  — generate recommendations for an emergency request
"""

from __future__ import annotations

import logging
from typing import Annotated

from fastapi import APIRouter, Depends

from app.api.dependencies.auth import CurrentUser, get_current_user
from app.schemas.common import APIResponse
from app.schemas.recommendation import RecommendationRequest
from app.services.recommendation_service import RecommendationService

router = APIRouter()
logger = logging.getLogger("medicare.routes.recommendation")


def _get_service() -> RecommendationService:
    return RecommendationService()


@router.post(
    "",
    response_model=APIResponse,
    summary="Get emergency service recommendations",
    description=(
        "Given an emergency request location, severity, and type, "
        "returns the best hospital, ambulance, and responder candidates "
        "ranked by a weighted score (40% distance, 30% availability, "
        "20% severity match, 10% capacity). "
        "ETA is a prototype estimate — not a guaranteed arrival time. "
        "Returns recommendation_available=false when no candidates exist."
    ),
    responses={
        200: {"description": "Recommendations returned (may be empty)"},
        401: {"description": "Authentication required"},
        422: {"description": "Validation error"},
    },
)
async def get_recommendations(
    payload: RecommendationRequest,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    service: Annotated[RecommendationService, Depends(_get_service)],
) -> APIResponse:
    logger.debug(
        "Recommendation request — user=%s type=%s severity=%s",
        current_user.id[:8],
        payload.emergency_type.value,
        payload.severity.value,
    )

    result = service.recommend(payload)

    return APIResponse(
        success=True,
        message=(
            "Recommendations retrieved successfully."
            if result.recommendation_available
            else "No suitable emergency service found nearby."
        ),
        data=result.model_dump(),
    )
