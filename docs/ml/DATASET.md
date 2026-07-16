# Dataset — Synthetic Severity v1

## Overview
- **Type:** SYNTHETIC — template-based, hand-reviewed
- **Size:** 1 200 rows
- **File:** `ml/severity/data/raw/synthetic_severity_v1.csv`
- **Clinical validity:** None — prototype only

## Label Distribution
| Severity | Count | % |
|---|---|---|
| low | 240 | 20% |
| medium | 360 | 30% |
| high | 360 | 30% |
| critical | 240 | 20% |

## Columns
`description, severity, emergency_type, age_group, conscious, breathing_difficulty, severe_breathing_difficulty, bleeding_level, chest_pain, seizure, stroke_signs, burn_level, allergic_reaction, pregnancy_emergency, major_accident, violence_risk`

## Generation
Run: `python ml/severity/src/generate_dataset.py`

## Manual Review Required
Before any real deployment, this dataset must be reviewed by qualified emergency medical personnel and replaced with de-identified real data.
