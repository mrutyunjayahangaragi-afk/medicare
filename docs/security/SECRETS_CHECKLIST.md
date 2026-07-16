# Secrets Management Checklist

## Audit Findings & Cleanup
- **Compromised Files:** `backend/.env.example` and `frontend/.env.example`
- **Exposed Keys Detected:**
  - Supabase Project keys (`qcwhylpizgilgfsjexxa`)
  - Gemini API key
  - Hugging Face API token
  - Geoapify API key
- **Action Taken:** Scrubbed all exposed credentials from these files, replacing them with generic placeholders (e.g. `your-gemini-api-key-here`).

## Development Guidelines
1. **Never Commit Secrets:** Real keys must reside ONLY in `.env` (backend) or `.env.local` (frontend). These files are explicitly matched in `.gitignore`.
2. **Review Examples:** `.env.example` files must contain only safe, synthetic placeholders.
3. **Frontend Isolation:** Never prefix secret API keys (like Geoapify, Gemini, or Supabase service roles) with `NEXT_PUBLIC_`. Prefixing makes them visible in the compiled browser bundle.
4. **Git Scan Hooks:** Integrate `gitleaks` or `trufflehog` pre-commit hooks to automatically prevent commits containing key-like strings.
