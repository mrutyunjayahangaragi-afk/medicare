"""
ml/severity/src/data_loader.py
Dataset loading and schema validation.
"""

from __future__ import annotations

import logging
from pathlib import Path

import pandas as pd

from ml.severity.src.preprocessing import REQUIRED_COLUMNS, normalize_dataset, validate_dataset

logger = logging.getLogger(__name__)


def load_dataset(path: str | Path) -> pd.DataFrame:
    """Load a CSV dataset, validate its schema, and return a normalised DataFrame.

    Args:
        path: Path to the CSV file.

    Returns:
        Normalised pd.DataFrame.

    Raises:
        FileNotFoundError: If the file does not exist.
        ValueError: If required columns are missing.
    """
    path = Path(path)
    if not path.exists():
        raise FileNotFoundError(f"Dataset not found: {path}")

    df = pd.read_csv(path, dtype=str, keep_default_na=False)
    logger.info("Loaded %d rows from %s", len(df), path)

    missing = REQUIRED_COLUMNS - set(df.columns)
    if missing:
        raise ValueError(f"Dataset missing required columns: {missing}")

    report = validate_dataset(df)
    logger.info("Dataset validation: %s", report)

    df = normalize_dataset(df)
    logger.info("Normalised dataset: %d rows", len(df))
    return df
