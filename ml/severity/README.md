# ML Severity Prediction Module

## Quick Start

```bash
cd backend
pip install -r requirements-ml.txt
python ml/severity/src/generate_dataset.py   # generate 1 200 synthetic rows
python -m ml.severity.src.train              # train + save artifacts
python -m ml.severity.src.evaluate           # evaluation report
```

## Structure

```
ml/severity/
├── src/
│   ├── generate_dataset.py   # Synthetic data generation (SYNTHETIC_DATA=True)
│   ├── data_loader.py        # CSV loading + validation
│   ├── preprocessing.py      # Normalisation
│   ├── feature_engineering.py# TF-IDF + OHE + bool pipeline
│   ├── safety_rules.py       # Deterministic override (safety-v1)
│   ├── train.py              # Training CLI
│   ├── evaluate.py           # Evaluation CLI
│   ├── predict.py            # Model strategy interface
│   ├── model_registry.py     # Singleton loader
│   └── hf_zero_shot.py       # Optional HF stub (disabled)
├── config.json               # Training configuration
├── artifacts/                # Saved pipeline + metadata (gitignored)
├── data/raw/                 # Raw CSV (gitignored)
├── data/processed/           # Processed data (gitignored)
└── reports/                  # Evaluation reports
```

## Safety Architecture

ML output → `SafetyRules.apply()` → Final severity (raises only, never lowers)

## Disclaimer

SYNTHETIC_DATA = True. No clinical validity. User must confirm severity before submission.
