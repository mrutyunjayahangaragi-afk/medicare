# API Security Audit Report

## Admin Route Protection
- **Vulnerability:** Admin API endpoints in `backend/app/api/v1/routes/admin.py` were unprotected or missing `require_admin` role checks.
- **Fix:** Integrated the `require_admin: CurrentUser = Depends(require_admin)` dependency into all admin endpoint routes (both GET and POST).
- **Non-Admin Block:** Attempts by non-admin users to hit these endpoints now yield a strict `HTTP 403 Forbidden` response.

## CORS Policy Hardening
- **Vulnerability:** CORS configured `allow_headers=["*"]` combined with `allow_credentials=True`.
- **Fix:** Explicitly listed required headers: `["Authorization", "Content-Type", "Accept", "X-Request-ID", "X-Supabase-Auth"]`.

## OpenAPI Documentation Safety
- **Vulnerability:** API schemas (/docs, /redoc, openapi.json) were exposed publicly in all environments.
- **Fix:** Confirmed environments using `APP_ENV`. Interactive docs are now disabled outside of `development`, `dev`, and `local` settings.

## Input Sanitization
- **Vulnerability:** Search filters in admin routes constructed dynamic query parameters directly from user strings, potentially breaking the query syntax in PostgREST.
- **Fix:** Integrated `_sanitize_search()` utility helper to strip special query control characters (e.g. parentheses, brackets, commas) before building `.or_()` clauses.
