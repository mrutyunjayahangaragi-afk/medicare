# HuggingFace Zero-Shot Severity — Experimental

**Status:** Disabled by default (`HF_SEVERITY_ENABLED=false`)

## Model
- `facebook/bart-large-mnli` (MIT license)
- Task: zero-shot-classification

## To Enable

```bash
# 1. Install dependencies
pip install transformers torch

# 2. Set in backend/.env
HF_SEVERITY_ENABLED=true
HF_SEVERITY_MODEL=facebook/bart-large-mnli
```

## Performance Characteristics
- Latency: 200–800 ms hosted, 1–3 s local CPU
- VRAM: ~1.6 GB
- Quality: Not evaluated on emergency severity task

## Notes
- This is a documented experiment only.
- Do not enable in production without evaluation.
- The `HuggingFaceSeverityModel` stub in `predict.py` raises `NotImplementedError` until properly implemented.
