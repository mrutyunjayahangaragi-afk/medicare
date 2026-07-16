"""
ml/severity/src/feature_engineering.py
Build the sklearn pipeline used for training and inference.

Pipeline:
  ColumnTransformer
    ├── TfidfVectorizer on description (word n-grams 1–2)
    ├── OneHotEncoder on categorical columns
    └── passthrough on boolean columns
  └── LogisticRegression(class_weight="balanced", max_iter=1000)

The pipeline is self-contained and serialisable with joblib.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from sklearn.compose import ColumnTransformer
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

_DEFAULT_CONFIG = {
    "tfidf_max_features": 5000,
    "ngram_range": [1, 2],
}

CATEGORICAL_COLUMNS = ["emergency_type", "age_group", "bleeding_level", "burn_level"]
BOOLEAN_COLUMNS = [
    "conscious",
    "breathing_difficulty",
    "severe_breathing_difficulty",
    "chest_pain",
    "seizure",
    "stroke_signs",
    "allergic_reaction",
    "pregnancy_emergency",
    "major_accident",
    "violence_risk",
]


def build_pipeline(config: dict[str, Any] | None = None) -> Pipeline:
    """Build and return the full sklearn training/inference pipeline.

    Args:
        config: Optional dict with keys tfidf_max_features, ngram_range.
                Falls back to defaults.

    Returns:
        An unfitted sklearn Pipeline.
    """
    cfg = {**_DEFAULT_CONFIG, **(config or {})}
    ngram_range = tuple(cfg["ngram_range"])  # type: ignore[arg-type]

    text_transformer = TfidfVectorizer(
        max_features=int(cfg["tfidf_max_features"]),
        ngram_range=ngram_range,
        strip_accents="unicode",
        sublinear_tf=True,
        min_df=2,
    )

    categorical_transformer = OneHotEncoder(
        handle_unknown="ignore",
        sparse_output=True,
    )

    preprocessor = ColumnTransformer(
        transformers=[
            ("text", text_transformer, "description"),
            ("cat", categorical_transformer, CATEGORICAL_COLUMNS),
            ("bool", "passthrough", BOOLEAN_COLUMNS),
        ],
        remainder="drop",
    )

    classifier = LogisticRegression(
        class_weight="balanced",
        max_iter=1000,
        solver="lbfgs",
        C=1.0,
        random_state=42,
    )

    return Pipeline(steps=[("preprocessor", preprocessor), ("classifier", classifier)])


def load_config(config_path: str | Path | None = None) -> dict[str, Any]:
    """Load training config from JSON, falling back to defaults."""
    default_path = Path(__file__).parent.parent / "config.json"
    path = Path(config_path) if config_path else default_path

    if path.exists():
        with open(path, encoding="utf-8") as f:
            return json.load(f)

    return _DEFAULT_CONFIG
