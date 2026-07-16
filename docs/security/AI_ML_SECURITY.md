# AI & ML Safety and Security Review

## Gemini Assistant Safety Integration
The `AssistantService` implements strict deterministic pre-checks and provider filters to ensure safe, medical-grade conversations.

1. **Input Truncation:** Checks input lengths to prevent prompt injection payload attacks (`ai_max_input_characters` configuration).
2. **Deterministic Safety Pre-check:** Checks query inputs for prompt injection patterns and unauthorized medical queries.
3. **Safety Fallback Short-cut:** Instantly bypasses AI calls for life-threatening keywords (e.g. cardiac arrest, suicide, stroke signs), directly rendering emergency instructions and the SOS button.
4. **Usage Tracking Rate Limiting:** Implements atomic per-minute and per-day rate checks on user queries to prevent denial-of-service (DoS) attacks on the AI provider.

## ML Severity Model Security
The ML Severity Prediction pipeline executes model runs while maintaining PII data isolation.

- **No Logging of Raw Inputs:** Log files never record patient description texts or comments. Only safe categorical metadata (e.g., age range, booleans, emergency type) is logged.
- **Trace Sanitization:** User ID is logged only at `DEBUG` level as a safe, truncated 8-character prefix.
- **Safety Overrides:** Models are coupled with hardcoded clinical safety rules (e.g., if chest pain is True, severity is forced to `critical` regardless of model output).
- **Stochastic Protections:** Model registry verifies signature hashes to ensure model files are not tampered with.
