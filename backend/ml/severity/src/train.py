"""
ml/severity/src/train.py
Training CLI for the severity prediction model.

Usage:
    python -m ml.severity.src.train
    python -m ml.severity.src.train --config ml/severity/config.json
    python -m ml.severity.src.train --data ml/severity/data/raw/synthetic_severity_v1.csv

Selects the model with the best macro-F1 on the test set.
Saves pipeline + metadata + metrics + label map to ml/severity/artifacts/.
"""

from __future__ import annotations

import argparse
import json
import logging
import sys
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(message)s")
logger = logging.getLogger(__name__)

ARTIFACTS_DIR = Path(__file__).parent.parent / "artifacts"


def main(config_path: str | None = None, data_path: str | None = None) -> None:
    try:
        import joblib
        import pandas as pd
        from sklearn.ensemble import RandomForestClassifier
        from sklearn.linear_model import LogisticRegression
        from sklearn.metrics import classification_report, f1_score
        from sklearn.model_selection import train_test_split
        from sklearn.pipeline import Pipeline
        from sklearn.svm import LinearSVC
        from sklearn.calibration import CalibratedClassifierCV
    except ImportError as e:
        logger.error("Missing ML dependencies: %s. Run: pip install -r requirements-ml.txt", e)
        sys.exit(1)

    from ml.severity.src.data_loader import load_dataset
    from ml.severity.src.feature_engineering import BOOLEAN_COLUMNS, CATEGORICAL_COLUMNS, build_pipeline, load_config

    # ── Config ────────────────────────────────────────────────────────────
    config = load_config(config_path)
    logger.info("Training config: %s", {k: v for k, v in config.items() if k not in ("models_to_evaluate",)})

    # ── Load data ─────────────────────────────────────────────────────────
    default_data_path = Path(__file__).parent.parent / "data" / "raw" / "synthetic_severity_v1.csv"
    dataset_path = Path(data_path) if data_path else default_data_path

    if not dataset_path.exists():
        logger.error("Dataset not found at %s. Run generate_dataset.py first.", dataset_path)
        sys.exit(1)

    df = load_dataset(dataset_path)
    logger.info("Label distribution:\n%s", df["severity"].value_counts().to_string())

    # Feature columns needed
    feature_cols = ["description"] + CATEGORICAL_COLUMNS + BOOLEAN_COLUMNS
    for col in feature_cols:
        if col not in df.columns:
            df[col] = 0

    X = df[feature_cols]
    y = df["severity"]

    labels = ["low", "medium", "high", "critical"]

    # ── Split ─────────────────────────────────────────────────────────────
    X_train, X_test, y_train, y_test = train_test_split(
        X, y,
        test_size=float(config.get("test_size", 0.2)),
        random_state=int(config.get("random_state", 42)),
        stratify=y,
    )
    logger.info("Train: %d  Test: %d", len(X_train), len(X_test))

    # ── Models to evaluate ────────────────────────────────────────────────
    candidate_pipelines: dict[str, Pipeline] = {}

    lr_pipeline = build_pipeline(config)
    candidate_pipelines["logistic_regression"] = lr_pipeline

    svc_pipeline = build_pipeline(config)
    svc_pipeline.steps[-1] = (
        "classifier",
        CalibratedClassifierCV(
            LinearSVC(class_weight="balanced", max_iter=2000, random_state=42),
            cv=3,
        ),
    )
    candidate_pipelines["linear_svc"] = svc_pipeline

    rf_pipeline = build_pipeline(config)
    rf_pipeline.steps[-1] = (
        "classifier",
        RandomForestClassifier(
            n_estimators=200, class_weight="balanced", random_state=42, n_jobs=-1
        ),
    )
    candidate_pipelines["random_forest"] = rf_pipeline

    # ── Train & evaluate all ──────────────────────────────────────────────
    best_name = ""
    best_f1 = -1.0
    best_pipeline: Pipeline | None = None
    all_metrics: dict[str, dict] = {}

    for name, pipeline in candidate_pipelines.items():
        logger.info("Training %s …", name)
        pipeline.fit(X_train, y_train)
        y_pred = pipeline.predict(X_test)
        macro_f1 = float(f1_score(y_test, y_pred, average="macro", zero_division=0))
        report = classification_report(y_test, y_pred, labels=labels, zero_division=0)
        logger.info("%s macro-F1: %.4f\n%s", name, macro_f1, report)
        all_metrics[name] = {"macro_f1": macro_f1, "report": report}

        if macro_f1 > best_f1:
            best_f1 = macro_f1
            best_name = name
            best_pipeline = pipeline

    logger.info("Selected model: %s (macro-F1=%.4f)", best_name, best_f1)

    # ── Save artifacts ─────────────────────────────────────────────────────
    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)

    pipeline_path = ARTIFACTS_DIR / "severity_pipeline.joblib"
    joblib.dump(best_pipeline, pipeline_path)
    logger.info("Pipeline saved → %s", pipeline_path)

    model_version = str(config.get("model_version", "severity-v1"))
    metadata = {
        "model_version": model_version,
        "selected_model": best_name,
        "macro_f1": best_f1,
        "labels": labels,
        "safety_rules_version": str(config.get("safety_rules_version", "safety-v1")),
        "confidence_threshold": float(config.get("confidence_threshold", 0.65)),
        "training_rows": len(X_train),
        "test_rows": len(X_test),
        "feature_columns": feature_cols,
        "label_column": "severity",
        "disclaimer": (
            "This model was trained on SYNTHETIC data. "
            "Predictions are suggestions only and carry no clinical validity."
        ),
        "synthetic_data": True,
    }
    with open(ARTIFACTS_DIR / "metadata.json", "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    label_map = {i: label for i, label in enumerate(labels)}
    with open(ARTIFACTS_DIR / "label_map.json", "w", encoding="utf-8") as f:
        json.dump(label_map, f)

    with open(ARTIFACTS_DIR / "metrics.json", "w", encoding="utf-8") as f:
        json.dump(
            {name: {"macro_f1": m["macro_f1"]} for name, m in all_metrics.items()},
            f, indent=2
        )

    logger.info("All artifacts saved to %s", ARTIFACTS_DIR)
    logger.info("Training complete. Selected: %s  macro-F1: %.4f", best_name, best_f1)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train severity prediction model")
    parser.add_argument("--config", default=None, help="Path to config.json")
    parser.add_argument("--data", default=None, help="Path to training CSV")
    args = parser.parse_args()
    main(args.config, args.data)
