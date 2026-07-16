"""
ml/severity/src/evaluate.py
Post-training evaluation CLI.

Usage:
    python -m ml.severity.src.evaluate
    python -m ml.severity.src.evaluate --data path/to/test.csv

Prints full classification report, confusion matrix, critical recall,
critical false-negative count, and high-or-critical combined recall.
Writes reports/evaluation_report.md.
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
REPORTS_DIR = Path(__file__).parent.parent / "reports"


def main(data_path: str | None = None) -> None:
    try:
        import joblib
        import pandas as pd
        from sklearn.metrics import classification_report, confusion_matrix, f1_score
    except ImportError as e:
        logger.error("Missing ML dependencies: %s", e)
        sys.exit(1)

    from ml.severity.src.data_loader import load_dataset
    from ml.severity.src.feature_engineering import BOOLEAN_COLUMNS, CATEGORICAL_COLUMNS

    pipeline_path = ARTIFACTS_DIR / "severity_pipeline.joblib"
    metadata_path = ARTIFACTS_DIR / "metadata.json"

    if not pipeline_path.exists():
        logger.error("No trained pipeline found. Run train.py first.")
        sys.exit(1)

    pipeline = joblib.load(pipeline_path)
    with open(metadata_path, encoding="utf-8") as f:
        metadata = json.load(f)

    logger.info("Loaded model: %s", metadata.get("model_version"))

    default_data_path = Path(__file__).parent.parent / "data" / "raw" / "synthetic_severity_v1.csv"
    dataset_path = Path(data_path) if data_path else default_data_path

    if not dataset_path.exists():
        logger.error("Dataset not found: %s", dataset_path)
        sys.exit(1)

    df = load_dataset(dataset_path)
    feature_cols = ["description"] + CATEGORICAL_COLUMNS + BOOLEAN_COLUMNS
    for col in feature_cols:
        if col not in df.columns:
            df[col] = 0

    X = df[feature_cols]
    y_true = df["severity"]
    labels = ["low", "medium", "high", "critical"]

    y_pred = pipeline.predict(X)

    report = classification_report(y_true, y_pred, labels=labels, zero_division=0)
    cm = confusion_matrix(y_true, y_pred, labels=labels)
    macro_f1 = float(f1_score(y_true, y_pred, average="macro", zero_division=0))

    critical_mask = y_true == "critical"
    critical_recall = (
        float((y_pred[critical_mask] == "critical").mean())
        if critical_mask.any() else 0.0
    )
    critical_fn = int(((y_true == "critical") & (y_pred != "critical")).sum())

    high_critical_mask = y_true.isin(["high", "critical"])
    hc_recall = (
        float(
            sum(p in ("high", "critical") for p in y_pred[high_critical_mask])
            / high_critical_mask.sum()
        )
        if high_critical_mask.any() else 0.0
    )

    print("\n=== Classification Report ===")
    print(report)
    print(f"Macro-F1:           {macro_f1:.4f}")
    print(f"Critical recall:    {critical_recall:.4f}")
    print(f"Critical FN count:  {critical_fn}")
    print(f"High+Critical recall: {hc_recall:.4f}")
    print("\nConfusion matrix (low, medium, high, critical):")
    print(cm)

    # Write markdown report
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    report_path = REPORTS_DIR / "evaluation_report.md"
    with open(report_path, "w", encoding="utf-8") as f:
        f.write(f"# Severity Model Evaluation Report\n\n")
        f.write(f"**Model version:** {metadata.get('model_version', 'unknown')}\n\n")
        f.write(f"## Classification Report\n\n```\n{report}\n```\n\n")
        f.write(f"## Key Metrics\n\n")
        f.write(f"| Metric | Value |\n|---|---|\n")
        f.write(f"| Macro-F1 | {macro_f1:.4f} |\n")
        f.write(f"| Critical Recall | {critical_recall:.4f} |\n")
        f.write(f"| Critical False Negatives | {critical_fn} |\n")
        f.write(f"| High+Critical Recall | {hc_recall:.4f} |\n\n")
        f.write(f"## Confusion Matrix\n\nLabels: low, medium, high, critical\n\n```\n{cm}\n```\n\n")
        f.write("**Note:** Safety rules are applied post-prediction. Critical recall above does not reflect safety-rule corrections.\n")

    logger.info("Evaluation report written → %s", report_path)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Evaluate severity prediction model")
    parser.add_argument("--data", default=None, help="Path to evaluation CSV")
    args = parser.parse_args()
    main(args.data)
