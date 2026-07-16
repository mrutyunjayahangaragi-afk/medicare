# Safety Rules — safety-v1

Deterministic override layer applied post-prediction. Rules **only raise** severity, never lower it.

## Severity Rank: low=0, medium=1, high=2, critical=3

## Critical Floor Rules

| Condition | Minimum Severity |
|---|---|
| severe_breathing_difficulty = True | critical |
| conscious = False AND breathing_difficulty = True | critical |
| bleeding_level = "severe" | critical |
| burn_level = "severe" | critical |
| major_accident AND conscious = False | critical |
| allergic_reaction AND severe_breathing_difficulty | critical |

## High Floor Rules

| Condition | Minimum Severity |
|---|---|
| stroke_signs = True | high |
| seizure = True | high |
| chest_pain = True | high |
| major_accident = True | high |
| violence_risk = True | high |
| pregnancy_emergency = True | high |
| burn_level = "moderate" | high |

## Implementation

`ml/severity/src/safety_rules.py` — `apply_safety_rules(ml_severity, indicators)`

Returns `SafetyOverrideResult` with `final_severity`, `override_applied`, `override_reason`.
