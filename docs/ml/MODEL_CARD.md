# Model Card — Medicare Severity Prediction v1

## Model Details
- **Name:** severity-v1
- **Type:** TF-IDF + Logistic Regression (sklearn pipeline)
- **Task:** Multi-class text + tabular classification (low / medium / high / critical)
- **Safety layer:** safety-v1 (deterministic override, raises only)

## Intended Use
- Suggesting a triage severity level to assist a user filling out an emergency request form.
- The suggestion is always reviewed and confirmed by the user.

## Out-of-Scope Uses
- Clinical diagnosis
- Replacing trained medical triage
- Automated emergency dispatch

## Training Data
- **Type:** Synthetic (template-based)
- **Size:** 1 200 rows
- **Distribution:** low 20%, medium 30%, high 30%, critical 20%
- **Validation status:** Not validated by medical professionals

## Performance (on synthetic test set)
- Macro-F1: 1.00 (near-perfect separability expected on synthetic data)
- Critical recall: 1.00
- Real-world performance: not yet evaluated

## Limitations
See [LIMITATIONS.md](./LIMITATIONS.md)

## Disclaimer
This model provides suggestions only. It is a prototype trained on synthetic data with no clinical validity. Always contact emergency services for life-threatening situations.
