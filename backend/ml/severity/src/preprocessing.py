"""
ml/severity/src/preprocessing.py
Data normalisation and dataset validation utilities.
"""

from __future__ import annotations

import logging
import re

import pandas as pd

logger = logging.getLogger(__name__)

VALID_SEVERITIES = {"low", "medium", "high", "critical"}
VALID_TYPES = {
    "medical", "accident", "fire", "crime", "flood",
    "electric", "child_safety", "elder_care", "animal_attack", "other",
}
VALID_AGE_GROUPS = {"child", "adult", "senior", "unknown"}
VALID_BLEED_LEVELS = {"none", "minor", "moderate", "severe"}
VALID_BURN_LEVELS = {"none", "minor", "moderate", "severe"}

REQUIRED_COLUMNS = {
    "description", "severity", "emergency_type",
}


def normalize_description(text: str | None) -> str:
    """Lowercase, collapse whitespace."""
    if not isinstance(text, str):
        return ""
    return re.sub(r"\s+", " ", text.strip().lower())


def normalize_boolean(value: object) -> int:
    """Convert varied boolean representations to 0 or 1."""
    if value is None or value is float("nan"):
        return 0
    if isinstance(value, bool):
        return int(value)
    if isinstance(value, (int, float)):
        return 1 if value else 0
    if isinstance(value, str):
        return 1 if value.strip().lower() in {"true", "1", "yes"} else 0
    return 0


def normalize_category(value: object, valid_values: set[str], default: str = "unknown") -> str:
    """Normalise a categorical column value."""
    if not isinstance(value, str) or not value.strip():
        return default
    cleaned = value.strip().lower()
    return cleaned if cleaned in valid_values else default


def normalize_dataset(df: pd.DataFrame) -> pd.DataFrame:
    """Apply all normalisations to a raw dataset DataFrame in-place."""
    df = df.copy()

    df["description"] = df["description"].apply(normalize_description)
    df["severity"] = df["severity"].apply(
        lambda v: normalize_category(v, VALID_SEVERITIES, "low")
    )
    df["emergency_type"] = df["emergency_type"].apply(
        lambda v: normalize_category(v, VALID_TYPES, "other")
    )
    df["age_group"] = df.get("age_group", pd.Series("unknown", index=df.index)).apply(
        lambda v: normalize_category(v, VALID_AGE_GROUPS, "unknown")
    )
    df["bleeding_level"] = df.get("bleeding_level", pd.Series("none", index=df.index)).apply(
        lambda v: normalize_category(v, VALID_BLEED_LEVELS, "none")
    )
    df["burn_level"] = df.get("burn_level", pd.Series("none", index=df.index)).apply(
        lambda v: normalize_category(v, VALID_BURN_LEVELS, "none")
    )

    bool_cols = [
        "conscious", "breathing_difficulty", "severe_breathing_difficulty",
        "chest_pain", "seizure", "stroke_signs", "allergic_reaction",
        "pregnancy_emergency", "major_accident", "violence_risk",
    ]
    for col in bool_cols:
        if col in df.columns:
            df[col] = df[col].apply(normalize_boolean)
        else:
            df[col] = 0

    return df


def validate_dataset(df: pd.DataFrame) -> dict[str, object]:
    """Produce a validation report dict. Logs warnings for issues."""
    report: dict[str, object] = {}
    missing = REQUIRED_COLUMNS - set(df.columns)
    if missing:
        report["missing_columns"] = sorted(missing)
        logger.error("Dataset missing required columns: %s", missing)

    report["total_rows"] = len(df)
    report["duplicate_rows"] = int(df.duplicated().sum())
    if report["duplicate_rows"]:
        logger.warning("Dataset has %d duplicate rows", report["duplicate_rows"])

    if "severity" in df.columns:
        invalid_sev = df[~df["severity"].isin(VALID_SEVERITIES)]
        report["invalid_severity_count"] = len(invalid_sev)
        report["severity_distribution"] = df["severity"].value_counts().to_dict()

    if "description" in df.columns:
        short_desc = df[df["description"].str.len() < 5]
        report["short_descriptions"] = len(short_desc)

    return report
