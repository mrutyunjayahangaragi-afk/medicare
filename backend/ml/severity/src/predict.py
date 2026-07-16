"""
ml/severity/src/predict.py
Strategy interface and implementations for severity prediction.

SeverityModel (Protocol)
  └── SklearnSeverityModel    — primary, uses joblib pipeline
  └── HuggingFaceSeverityModel — stub, disabled by default (HF_SEVERITY_ENABLED=false)
"""

from __future__ import annotations

import logging
from typing import Protocol, runtime_checkable

import numpy as np

logger = logging.getLogger(__name__)


# ── Protocol ──────────────────────────────────────────────────────────────

@runtime_checkable
class SeverityModel(Protocol):
    """Strategy interface for severity prediction models."""

    def predict(self, features: dict) -> tuple[str, float]:
        """Predict severity for a single feature dict.

        Returns:
            (severity_label, confidence)  where confidence ∈ [0, 1].
        """
        ...


# ── Sklearn implementation ────────────────────────────────────────────────

class SklearnSeverityModel:
    """Loads a joblib-serialised sklearn pipeline and performs inference."""

    def __init__(self, pipeline: object, labels: list[str]) -> None:
        self._pipeline = pipeline
        self._labels = labels

    def predict(self, features: dict) -> tuple[str, float]:
        """Predict severity.

        Args:
            features: Dict with keys matching the training DataFrame columns.

        Returns:
            (predicted_label, confidence)
        """
        import pandas as pd

        df = pd.DataFrame([features])
        # Ensure column order matches training
        from ml.severity.src.feature_engineering import BOOLEAN_COLUMNS, CATEGORICAL_COLUMNS
        expected_cols = ["description"] + CATEGORICAL_COLUMNS + BOOLEAN_COLUMNS
        for col in expected_cols:
            if col not in df.columns:
                df[col] = 0

        df = df[expected_cols]

        prediction = self._pipeline.predict(df)[0]

        try:
            proba = self._pipeline.predict_proba(df)[0]
            confidence = float(np.max(proba))
        except AttributeError:
            # Pipeline doesn't support predict_proba (e.g. LinearSVC without calibration)
            confidence = 1.0

        return str(prediction), confidence


# ── HuggingFace stub ──────────────────────────────────────────────────────

class HuggingFaceSeverityModel:
    """Stub implementation for zero-shot classification via HuggingFace.

    Disabled by default (HF_SEVERITY_ENABLED=false in config).
    When enabled, uses a zero-shot-classification pipeline locally
    or via InferenceClient for hosted inference.

    Model ID: facebook/bart-large-mnli (Apache 2.0, ~400 MB VRAM)
    Latency: ~200–800 ms hosted, ~1–3 s local CPU.
    Memory: ~1.6 GB RAM when loaded locally.

    This is documented as an experimental option, not production-grade.
    Never runs in production unless HF_SEVERITY_ENABLED=true is explicitly set.
    """

    CANDIDATE_LABELS = ["low severity", "medium severity", "high severity", "critical severity"]
    LABEL_MAP = {
        "low severity": "low",
        "medium severity": "medium",
        "high severity": "high",
        "critical severity": "critical",
    }

    def predict(self, features: dict) -> tuple[str, float]:
        raise NotImplementedError(
            "HuggingFaceSeverityModel is disabled. "
            "Set HF_SEVERITY_ENABLED=true and install transformers to enable."
        )


# ── Factory ───────────────────────────────────────────────────────────────

class SeverityModelFactory:
    """Return the configured SeverityModel implementation."""

    @staticmethod
    def create(
        pipeline: object | None,
        labels: list[str],
        hf_enabled: bool = False,
    ) -> SeverityModel:
        if hf_enabled:
            return HuggingFaceSeverityModel()
        if pipeline is None:
            raise ValueError("Pipeline is required when HF is disabled.")
        return SklearnSeverityModel(pipeline, labels)
