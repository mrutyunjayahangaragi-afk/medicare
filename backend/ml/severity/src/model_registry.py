"""
ml/severity/src/model_registry.py
ModelRegistry singleton — loads pipeline and metadata once per process.

Usage:
    from ml.severity.src.model_registry import ModelRegistry, ModelUnavailableError

    try:
        registry = ModelRegistry.get()
    except ModelUnavailableError:
        # Return 503 — never block the SOS form
        ...

    severity, confidence = registry.model.predict(features)
"""

from __future__ import annotations

import json
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

ARTIFACTS_DIR = Path(__file__).parent.parent / "artifacts"


class ModelUnavailableError(RuntimeError):
    """Raised when model artifacts are missing or corrupt."""


class ModelRegistry:
    """Holds the loaded pipeline, metadata, and label mapping."""

    _instance: "ModelRegistry | None" = None

    def __init__(
        self,
        model: object,
        metadata: dict,
        label_mapping: dict[str, str],
    ) -> None:
        self.model = model
        self.metadata = metadata
        self.label_mapping = label_mapping

    @property
    def version(self) -> str:
        return str(self.metadata.get("model_version", "unknown"))

    @property
    def labels(self) -> list[str]:
        return list(self.metadata.get("labels", ["low", "medium", "high", "critical"]))

    @property
    def confidence_threshold(self) -> float:
        return float(self.metadata.get("confidence_threshold", 0.65))

    @property
    def safety_rules_version(self) -> str:
        return str(self.metadata.get("safety_rules_version", "safety-v1"))

    @staticmethod
    def get() -> "ModelRegistry":
        """Load and cache the model registry. Raises ModelUnavailableError if artifacts missing.

        Unlike the previous lru_cache approach, this method re-attempts loading
        on every call until it succeeds, so a transient startup failure does not
        permanently block the ML feature for the lifetime of the process.
        """
        if ModelRegistry._instance is not None:
            return ModelRegistry._instance

        pipeline_path = ARTIFACTS_DIR / "severity_pipeline.joblib"
        metadata_path = ARTIFACTS_DIR / "metadata.json"
        label_map_path = ARTIFACTS_DIR / "label_map.json"

        missing = [p for p in [pipeline_path, metadata_path, label_map_path] if not p.exists()]
        if missing:
            raise ModelUnavailableError(
                f"Model artifacts not found: {[str(p) for p in missing]}. "
                "Run: python ml/severity/src/generate_dataset.py && "
                "python -m ml.severity.src.train"
            )

        try:
            import joblib
        except ImportError as e:
            raise ModelUnavailableError("joblib not installed. Run: pip install -r requirements-ml.txt") from e

        try:
            pipeline = joblib.load(pipeline_path)
        except Exception as exc:
            raise ModelUnavailableError(f"Failed to load pipeline: {exc}") from exc

        try:
            with open(metadata_path, encoding="utf-8") as f:
                metadata = json.load(f)
            with open(label_map_path, encoding="utf-8") as f:
                raw_label_map: dict[str, str] = json.load(f)
        except Exception as exc:
            raise ModelUnavailableError(f"Failed to read metadata: {exc}") from exc

        from ml.severity.src.predict import SeverityModelFactory
        labels = metadata.get("labels", ["low", "medium", "high", "critical"])
        model = SeverityModelFactory.create(pipeline=pipeline, labels=labels)

        logger.info("ModelRegistry loaded — version=%s", metadata.get("model_version"))
        instance = ModelRegistry(model=model, metadata=metadata, label_mapping=raw_label_map)
        ModelRegistry._instance = instance
        return instance
