"""
app/api/v1/routes/ml_severity.py
ML severity prediction API endpoints.

POST /api/v1/ml/severity/predict   — predict severity (auth required)
GET  /api/v1/ml/severity/model-info — model metadata (auth required)
GET  /api/v1/ml/severity/health     — model health check (auth required)

Security:
  - All endpoints require a valid Bearer token.
  - No file paths, dataset paths, tokens, or coefficients are exposed.
  - 503 is returned when model artifacts are missing — never blocks the SOS form.
  - Description text is never logged.
"""

from __future__ import annotations

import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.dependencies.auth import CurrentUser, get_current_user
from app.core.config import get_settings
from app.schemas.common import APIResponse
from app.schemas.severity_prediction import SeverityPredictionRequest, SeverityPredictionResponse
from app.services.severity_prediction_service import SeverityPredictionService

router = APIRouter()
logger = logging.getLogger("medicare.routes.ml_severity")


def _get_service() -> SeverityPredictionService:
    return SeverityPredictionService()


@router.post(
    "/predict",
    response_model=APIResponse,
    summary="Predict emergency severity",
    description=(
        "Predicts the severity level (low/medium/high/critical) for an emergency request. "
        "A deterministic safety layer ensures ML can never under-triage life-threatening indicators. "
        "This is a suggestion only — the user must confirm before submitting. "
        "Returns 503 when model artifacts are not yet available."
    ),
    responses={
        200: {"description": "Prediction returned"},
        401: {"description": "Authentication required"},
        422: {"description": "Validation error"},
        503: {"description": "Model not available — SOS form still works"},
    },
)
async def predict_severity(
    payload: SeverityPredictionRequest,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    service: Annotated[SeverityPredictionService, Depends(_get_service)],
) -> APIResponse:
    settings = get_settings()

    if not settings.ml_severity_enabled:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="ML severity prediction is currently disabled.",
        )

    try:
        result: SeverityPredictionResponse = service.predict(
            request=payload,
            user_id=current_user.id,
            confidence_threshold=settings.ml_severity_confidence_threshold,
        )
    except RuntimeError as exc:
        # Model artifacts missing — return 503, never a 500
        logger.warning("Severity model unavailable: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Severity prediction model is not yet available. "
                "Please train the model first. The SOS form still works normally."
            ),
        ) from exc

    return APIResponse(
        success=True,
        message="Severity prediction completed.",
        data=result.model_dump(),
    )


@router.get(
    "/model-info",
    response_model=APIResponse,
    summary="Get severity model information",
    description="Returns safe model metadata: version, labels, confidence threshold, safety rules version.",
    responses={
        200: {"description": "Model info returned"},
        401: {"description": "Authentication required"},
        503: {"description": "Model not available"},
    },
)
async def model_info(
    _current_user: Annotated[CurrentUser, Depends(get_current_user)],
) -> APIResponse:
    settings = get_settings()

    try:
        from ml.severity.src.model_registry import ModelRegistry, ModelUnavailableError
        registry = ModelRegistry.get()
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Severity model artifacts not found. Run training first.",
        ) from exc

    return APIResponse(
        success=True,
        message="Model info retrieved.",
        data={
            "model_version": registry.version,
            "status": "ready",
            "supported_labels": registry.labels,
            "confidence_threshold": registry.confidence_threshold,
            "safety_rules_version": registry.safety_rules_version,
            "disclaimer": registry.metadata.get("disclaimer", ""),
            "synthetic_data": registry.metadata.get("synthetic_data", True),
        },
    )


@router.get(
    "/health",
    response_model=APIResponse,
    summary="Severity model health check",
    description="Returns whether the model is loaded and ready.",
    responses={
        200: {"description": "Model status"},
        401: {"description": "Authentication required"},
    },
)
async def severity_health(
    _current_user: Annotated[CurrentUser, Depends(get_current_user)],
) -> APIResponse:
    settings = get_settings()

    if not settings.ml_severity_enabled:
        return APIResponse(
            success=True,
            message="Severity prediction disabled.",
            data={"status": "disabled"},
        )

    try:
        from ml.severity.src.model_registry import ModelRegistry
        registry = ModelRegistry.get()
        return APIResponse(
            success=True,
            message="Severity model is ready.",
            data={"status": "ready", "model_version": registry.version},
        )
    except Exception:
        return APIResponse(
            success=True,
            message="Severity model not yet trained.",
            data={"status": "not_ready"},
        )
