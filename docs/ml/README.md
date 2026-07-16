# ML Severity Prediction — Medicare Step 17

## Purpose
Suggests a severity level (low / medium / high / critical) for an emergency request based on the description text and optional risk indicators. This is always a **suggestion** — the user retains full control and the SOS form works without it.

## Safety Architecture

```
ML Model Output
      │
      ▼
SafetyRules.apply(indicators) ── Deterministic override (never lowers)
      │
      ▼
Final Suggested Severity
      │
      ▼
User: Accept / Override / Ignore
      │
      ▼
SOS Submission (always with user-confirmed severity)
```

## Quick Start

```bash
cd backend
pip install -r requirements-ml.txt
python ml/severity/src/generate_dataset.py
python -m ml.severity.src.train
python -m ml.severity.src.evaluate
```

## Documents

| File | Description |
|---|---|
| [DATASET.md](./DATASET.md) | Dataset spec and generation |
| [FEATURES.md](./FEATURES.md) | Feature engineering |
| [TRAINING.md](./TRAINING.md) | Training procedure |
| [EVALUATION.md](./EVALUATION.md) | Evaluation results |
| [MODEL_CARD.md](./MODEL_CARD.md) | Model card |
| [SAFETY.md](./SAFETY.md) | Safety rules documentation |
| [HUGGINGFACE.md](./HUGGINGFACE.md) | Optional HF integration |
| [LIMITATIONS.md](./LIMITATIONS.md) | Known limitations |
