# Known Limitations

1. **Synthetic training data** — The model was trained on 1 200 hand-crafted synthetic examples. It has no exposure to real patient data and carries no clinical validity.

2. **English-only** — Description text must be in English. Non-English input will degrade silently.

3. **Template-based generation** — The synthetic dataset has near-perfect separability (F1=1.0). Real-world performance will be significantly lower. An F1 of 0.6–0.75 on real data is a more realistic expectation before human review.

4. **No age/demographic awareness** — `age_group` is used as a feature but has no meaningful effect in the current dataset.

5. **Safety rules are not exhaustive** — The deterministic safety layer covers the most critical indicators but is not a substitute for clinical triage protocols.

6. **No model retraining on production data** — The model must be retrained with real (de-identified) data before being considered for any clinical use. This is a prototype only.

7. **Rate limiting** — The `/predict` endpoint has a soft rate limit of 10 requests/minute per user enforced at the application layer only.

8. **No multilingual support** — See point 2.
