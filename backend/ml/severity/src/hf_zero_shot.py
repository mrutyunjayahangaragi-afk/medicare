"""
ml/severity/src/hf_zero_shot.py
Optional HuggingFace zero-shot severity classification.

DISABLED BY DEFAULT — HF_SEVERITY_ENABLED=false.

Model: facebook/bart-large-mnli
License: MIT
Approx. VRAM: 1.6 GB (CPU inference possible, slower)
Approx. latency: 200–800 ms hosted, 1–3 s local CPU
Context window: 1 024 tokens

To enable:
  1. pip install transformers torch
  2. Set HF_SEVERITY_ENABLED=true in backend/.env
  3. Optionally set HF_SEVERITY_MODEL=your-model-id

Never enable in production without a full evaluation against
your real severity distribution. This module documents the
experiment only — do not use for clinical decisions.
"""

from __future__ import annotations

import logging

logger = logging.getLogger(__name__)

_MODEL_ID = "facebook/bart-large-mnli"
_CANDIDATE_LABELS = [
    "low severity emergency",
    "medium severity emergency",
    "high severity emergency",
    "critical life-threatening emergency",
]
_LABEL_MAP = {
    "low severity emergency": "low",
    "medium severity emergency": "medium",
    "high severity emergency": "high",
    "critical life-threatening emergency": "critical",
}


def run_zero_shot(description: str, model_id: str | None = None) -> tuple[str, float]:
    """Run zero-shot classification on the description string.

    Args:
        description: Emergency description text.
        model_id: HuggingFace model ID (default: facebook/bart-large-mnli).

    Returns:
        (severity_label, confidence)

    Raises:
        ImportError: If transformers is not installed.
        RuntimeError: On inference failure.
    """
    try:
        from transformers import pipeline as hf_pipeline  # type: ignore[import-untyped]
    except ImportError as e:
        raise ImportError(
            "transformers is not installed. "
            "pip install transformers torch to enable HF zero-shot."
        ) from e

    chosen_model = model_id or _MODEL_ID
    logger.info("[hf_zero_shot] Running inference with model=%s", chosen_model)

    classifier = hf_pipeline("zero-shot-classification", model=chosen_model)
    result = classifier(description, candidate_labels=_CANDIDATE_LABELS)

    top_label: str = result["labels"][0]  # type: ignore[index]
    top_score: float = float(result["scores"][0])  # type: ignore[index]

    severity = _LABEL_MAP.get(top_label, "medium")
    logger.info("[hf_zero_shot] result=%s confidence=%.3f", severity, top_score)
    return severity, top_score
