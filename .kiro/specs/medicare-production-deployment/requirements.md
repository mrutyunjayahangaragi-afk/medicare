# Requirements Document

## Introduction

This document captures the formal requirements for the production deployment of the Medicare
emergency assistance platform. Medicare is a full-stack system comprising a Next.js 16 / React 19
frontend deployed to Vercel, a FastAPI / Python 3.12 backend deployed to Render, and a Supabase
managed backend (PostgreSQL, Auth, Storage, Realtime). The deployment must be zero-downtime,
security-reviewed, and operate within free-tier constraints while establishing an operational
baseline for future scaling.

Requirements are derived from the approved design document and cover: frontend deployment,
backend deployment, database migration and infrastructure, authentication, security hardening,
ML severity prediction, smoke testing, performance mitigations, and release management.

---

## Glossary

- **Deployment_System**: The automated and manual set of steps, configuration, and scripts that
  deploy Medicare to production across Vercel, Render, and Supabase.
- **Frontend**: The Next.js 16 / React 19 application served via Vercel SSR.
- **Backend**: The FastAPI / Python 3.12 REST API served via Render.
- **Supabase**: The managed service providing PostgreSQL, Auth, Storage, and Realtime.
- **ML_Pipeline**: The scikit-learn joblib severity prediction pipeline loaded at Backend startup.
- **Auth_System**: Supabase Auth handling JWT issuance, Google OAuth, and session management.
- **Secret_Scanner**: The pre-deployment tool that inspects staged Git files for accidental
  secret exposure.
- **Smoke_Test**: A post-deployment integration verification covering all four portals.
- **RLS**: Row-Level Security policies enforced by PostgreSQL within Supabase.
- **CORS**: Cross-Origin Resource Sharing — the mechanism controlling which origins the Browser
  may call the Backend from.
- **CSP**: Content Security Policy — the HTTP response header controlling resource loading origins.
- **Cold_Start**: The ~30–60 second delay experienced when the Render free-tier container resumes
  from an idle state.
- **ModelRegistry**: The Backend component that loads and caches the ML_Pipeline from joblib
  artifacts at startup.
- **Geoapify_Client**: The Backend HTTP integration for nearby medical services lookup.
- **Gemini_Provider**: The Backend AI assistant integration using Google Generative AI.
- **Vercel_URL**: The canonical HTTPS URL of the deployed Frontend (e.g., `https://<project>.vercel.app`).
- **Render_URL**: The canonical HTTPS URL of the deployed Backend (e.g., `https://<service>.onrender.com`).
- **JWT**: JSON Web Token issued by Supabase Auth and presented to the Backend as a Bearer token.
- **Migration_Sequence**: The ordered set of 16 SQL migration files that define the production
  database schema.
- **Release_Tag**: The annotated Git tag `v1.0.0-prod` marking the production deployment commit.

---

## Requirements

### Requirement 1: Frontend Deployment to Vercel

**User Story:** As a deployment engineer, I want to deploy the Next.js frontend to Vercel with
correct project configuration, so that all four user portals are publicly accessible over HTTPS.

#### Acceptance Criteria

1. THE Deployment_System SHALL configure the Vercel project with root directory set to `frontend`,
   framework set to `nextjs`, build command `next build`, install command `npm ci`, and Node
   version `20.x`.
2. WHEN the Frontend is deployed to Vercel, THE Deployment_System SHALL set all four required
   environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `NEXT_PUBLIC_API_URL`, and `NEXT_PUBLIC_SITE_URL`.
3. WHEN `NODE_ENV` is `production` and `NEXT_PUBLIC_API_URL` contains the substring `localhost`,
   THE Frontend SHALL throw a build-time error preventing deployment.
4. WHEN the deployed Frontend page is fetched over HTTPS, THE Frontend SHALL return the
   `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy:
   strict-origin-when-cross-origin`, and `Strict-Transport-Security` response headers.
5. WHEN the deployed Frontend page is fetched over HTTPS, THE Frontend SHALL return a
   `Content-Security-Policy` header whose `connect-src` directive does not contain `localhost`.
6. WHEN the deployed Frontend HTML is inspected and `http://` resource references are found,
   THE Deployment_System SHALL log a warning but SHALL NOT block the deployment from proceeding.
7. WHEN the Frontend production build is triggered, THE Deployment_System SHALL execute
   `next build` and the build SHALL complete successfully with zero TypeScript compilation errors
   before the deployment artifact is promoted to production.

---

### Requirement 2: Backend Deployment to Render

**User Story:** As a deployment engineer, I want to deploy the FastAPI backend to Render with
correct runtime configuration, so that the REST API is reachable from the frontend and returns
correct responses for health, auth, and API routes.

#### Acceptance Criteria

1. THE Deployment_System SHALL configure the Render service with root directory `backend`,
   Python version `3.12` (declared in `backend/.python-version`), build command
   `pip install -r requirements.txt && pip install -r requirements-ml.txt`, start command
   `uvicorn app.main:app --host 0.0.0.0 --port $PORT`, and health check path `/api/v1/health`.
2. WHEN the Backend is deployed, THE Deployment_System SHALL set `APP_ENV=production` and
   `DEBUG=false` in the Render environment.
3. WHEN `GET /api/v1/health` is called on a warm Backend instance, THE Backend SHALL respond
   with HTTP 200, `status: "healthy"`, and `environment: "production"` within 10 seconds.
4. WHEN `GET /docs`, `GET /redoc`, or `GET /openapi.json` is called and `APP_ENV=production`,
   THE Backend SHALL respond with HTTP 404.
5. WHEN `GET /api/v1/auth/me` is called without a valid JWT, THE Backend SHALL respond with
   HTTP 401 and `success: false`, and the response body SHALL NOT contain a Python traceback
   or any secret value.
6. WHEN the Backend is deployed, THE Deployment_System SHALL set `BACKEND_CORS_ORIGINS` to a
   JSON array containing only the Vercel_URL (and optionally a custom domain) — the value SHALL
   NOT include `"*"` and SHALL NOT include any `http://` origin.
7. WHEN a CORS preflight `OPTIONS` request arrives from the Vercel_URL, THE Backend SHALL include
   `Access-Control-Allow-Origin: <Vercel_URL>` in the response headers.
8. WHEN a CORS preflight `OPTIONS` request arrives from an origin not listed in
   `BACKEND_CORS_ORIGINS`, THE Backend SHALL NOT include an `Access-Control-Allow-Origin` header
   in the response.

---

### Requirement 3: Supabase Database and Infrastructure

**User Story:** As a deployment engineer, I want the Supabase database schema, RLS policies,
Realtime publications, and Storage buckets to be correctly configured, so that all data operations
are secure and functional in production.

#### Acceptance Criteria

1. WHEN the Migration_Sequence is applied to a Supabase project, THE Deployment_System SHALL
   apply all 16 migration files in chronological timestamp order without skipping or reordering
   any file.
2. WHEN the Migration_Sequence is applied twice to a clean Supabase database, THE Deployment_System
   SHALL produce the same final schema state as applying it once (idempotency — no duplicate
   tables, indexes, or constraint violations).
3. AFTER the Migration_Sequence is applied, THE Supabase SHALL have RLS enabled (`rowsecurity =
   TRUE`) on all nine user-data tables: `emergency_requests`, `profiles`, `notifications`,
   `messages`, `responder_locations`, `emergency_contacts`, `organizations`, `ai_conversations`,
   and `ai_messages`.
4. WHEN an `authenticated` user queries any RLS-protected table, THE Supabase SHALL return only
   rows the user owns or is explicitly authorized to read per the applicable RLS policy — never
   rows belonging to another user.
5. WHEN the `supabase_realtime` publication is verified, THE Supabase SHALL include all four
   required tables: `emergency_requests`, `notifications`, `messages`, and `responder_locations`.
6. WHEN a user subscribes to Realtime `postgres_changes` for the `emergency_requests` table,
   THE Supabase SHALL deliver only events for rows where `user_id = auth.uid()` to that subscriber.
7. THE Deployment_System SHALL configure four Storage buckets — `evidence`,
   `application-documents`, `profile-avatars`, and `hospital-documents` — each with the
   access policies specified in the design (INSERT/SELECT/DELETE per role).

---

### Requirement 4: Google OAuth and Authentication Configuration

**User Story:** As a deployment engineer, I want Google OAuth and Supabase Auth to be correctly
configured for production, so that users can authenticate via email/password and Google sign-in.

#### Acceptance Criteria

1. THE Deployment_System SHALL configure the Supabase Auth Site URL to the Vercel_URL and add
   redirect URLs `<Vercel_URL>/auth/callback` and `<Vercel_URL>/**`.
2. THE Deployment_System SHALL configure the Google Cloud Console OAuth 2.0 credential with
   authorized JavaScript origin `https://<project>.supabase.co` and authorized redirect URI
   `https://<project>.supabase.co/auth/v1/callback`.
3. THE Deployment_System SHALL enable the Google OAuth provider in the Supabase Dashboard by
   setting the Google client ID and client secret.
4. WHEN a user completes the Google OAuth consent flow, THE Auth_System SHALL exchange the
   authorization code for a JWT session and redirect the user to `/auth/callback` on the
   Frontend — the token exchange SHALL proceed regardless of any mid-flow changes to provider
   configuration.
5. WHEN the Frontend receives the OAuth callback with a valid session code, THE Frontend SHALL
   complete `exchangeCodeForSession` and redirect the authenticated user to `/dashboard`.

---

### Requirement 5: Security Hardening

**User Story:** As a security reviewer, I want all secrets to be isolated to their correct
service scope, all .env files to be excluded from Git, and a pre-deployment secret scan to run,
so that no credentials are exposed in the codebase or over the network.

#### Acceptance Criteria

1. THE Deployment_System SHALL ensure `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, and
   `GEOAPIFY_API_KEY` are set only in the Render environment and never in any `NEXT_PUBLIC_*`
   Vercel environment variable.
2. FOR ALL HTTP responses from any Frontend endpoint or page, THE Frontend SHALL NOT include
   `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, or `GEOAPIFY_API_KEY` values in the response
   body or response headers.
3. THE Deployment_System SHALL verify that `.env` is listed in `backend/.gitignore` and
   `.env.local` is listed in `frontend/.gitignore` before any production commit is made.
4. WHEN the Secret_Scanner is run against staged Git files, THE Secret_Scanner SHALL return an
   empty result list if no files contain the patterns `supabase_service_role`, `GEMINI_API_KEY`,
   `GEOAPIFY_API_KEY`, `eyJ` (JWT prefix), or any 40+ character hexadecimal string outside a
   `.gitignore` file.
5. IF the Secret_Scanner detects any secret pattern in staged files, THEN THE Deployment_System
   SHALL halt the deployment process and return a list of offending `<file>:<line>: <pattern>`
   entries.
6. WHEN the Backend logs a request, THE Backend SHALL mask all sensitive configuration keys with
   `***HIDDEN***` and SHALL NOT include raw tracebacks or secret values in any log line or HTTP
   response body.

---

### Requirement 6: Protected Endpoint Access Control

**User Story:** As a security reviewer, I want all protected API endpoints to enforce JWT
authentication and return safe, predictable error responses, so that unauthorized access is
consistently rejected and no internal state is leaked.

#### Acceptance Criteria

1. FOR ALL `/api/v1/*` endpoints except `/api/v1/health`, WHEN a request is received without a
   valid Supabase JWT, THE Backend SHALL return HTTP 401 with `success: false` — never HTTP 200,
   403, or 500.
2. WHEN a request is received with an expired JWT, THE Backend SHALL return HTTP 401 with
   `success: false`.
3. WHEN `GET /docs`, `GET /redoc`, or `GET /openapi.json` is called and `APP_ENV=production`,
   THE Backend SHALL return HTTP 404 (Swagger UI is disabled outside development).

---

### Requirement 7: ML Severity Prediction Pipeline

**User Story:** As a deployment engineer, I want the ML severity prediction service to load
correctly at startup and degrade gracefully when unavailable, so that emergency triage is
available in production and the SOS flow is never blocked by ML failure.

#### Acceptance Criteria

1. WHEN `ML_SEVERITY_ENABLED=true` and all three required artifacts (`severity_pipeline.joblib`,
   `metadata.json`, `label_map.json`) are present, THE ModelRegistry SHALL load the ML_Pipeline
   successfully at Backend startup without raising `ModelUnavailableError`.
2. WHEN `ML_SEVERITY_ENABLED=false` or any required ML artifact is missing, THE Backend SHALL
   return HTTP 503 with `success: false` for `POST /api/v1/ml/severity/predict` — never HTTP 200
   with a null or out-of-enum severity value.
3. FOR ALL valid `SeverityPredictionRequest` inputs, THE ML_Pipeline SHALL return a
   `predicted_severity` value that is one of `["low", "medium", "high", "critical"]` — never
   null and never outside this enumeration.
4. FOR the same `SeverityPredictionRequest` input submitted twice, THE ML_Pipeline SHALL return
   the same `predicted_severity` label both times (deterministic output — the pipeline is
   stateless).
5. THE Deployment_System SHALL verify that all three required ML artifact files are present in
   `backend/ml/severity/artifacts/` and are committed to Git before deployment.
6. THE Deployment_System SHALL use `pathlib.Path` for all ML artifact path resolution to ensure
   Linux-compatible paths on the Render runtime.

---

### Requirement 8: Smoke Testing Across All Portals

**User Story:** As a deployment engineer, I want a structured smoke test to verify all four
portals and key platform flows post-deployment, so that I can confirm the production system
is functioning end-to-end before releasing to users.

#### Acceptance Criteria

1. WHEN the smoke test is executed for the User portal, THE Smoke_Test SHALL verify that a test
   user can authenticate via email/password, create an emergency request (HTTP 201), receive an
   ML severity prediction with a valid label, and receive a recommendation response (HTTP 200).
2. WHEN the smoke test is executed for the Responder portal, THE Smoke_Test SHALL verify that a
   test responder account can authenticate and retrieve the emergency request list (HTTP 200).
3. WHEN the smoke test is executed for the Hospital portal, THE Smoke_Test SHALL verify that a
   test hospital account can authenticate and retrieve the request list (HTTP 200).
4. WHEN the smoke test is executed for the Admin portal, THE Smoke_Test SHALL verify that a test
   admin account can authenticate and retrieve the application list (HTTP 200).
5. WHEN the smoke test establishes a Supabase Realtime channel subscription to
   `emergency_requests`, THE Smoke_Test SHALL confirm `channel.status = "SUBSCRIBED"`.
6. THE Smoke_Test SHALL flag the Google OAuth verification step as a manual browser check
   (automated flow is blocked by browser consent screens).

---

### Requirement 9: Performance and Free-Tier Constraint Mitigations

**User Story:** As a deployment engineer, I want the system to handle free-tier service
limitations gracefully, so that users experience acceptable performance despite Render cold
starts, Vercel bandwidth limits, and Supabase storage constraints.

#### Acceptance Criteria

1. WHEN the Frontend makes an API call that fails due to a Backend Cold_Start or transient
   network error, THE Frontend SHALL retry the call up to three times using exponential backoff
   with a base delay of 1000 ms.
2. WHEN the Gemini_Provider receives a request that would exceed `AI_RATE_LIMIT_PER_MINUTE` or
   `AI_RATE_LIMIT_PER_DAY`, THE Backend SHALL return HTTP 429 with `success: false` — never
   silently drop the request or return an incomplete response.
3. THE Geoapify_Client SHALL cache responses and apply a configurable timeout of
   `GEOAPIFY_TIMEOUT_SECONDS` (default 10) to all outbound Geoapify HTTP requests.
4. THE Deployment_System SHALL document the Render cold start behavior (~30–60 seconds on free
   tier) for end users and operations staff.

---

### Requirement 10: Release Management and Rollback

**User Story:** As a deployment engineer, I want a defined release tagging convention and tested
rollback procedures, so that any production incident can be recovered quickly and the deployment
history is traceable.

#### Acceptance Criteria

1. WHEN the production deployment is complete and all smoke tests pass, THE Deployment_System
   SHALL create and push the annotated Git tag `v1.0.0-prod` with a message containing the
   deployment date in UTC format `YYYY-MM-DD`.
2. THE Deployment_System SHALL create deployment documentation files in `docs/deployment/`
   covering: `README.md` (overview and rollback summary), `vercel.md`, `render.md`,
   `supabase.md`, `google-oauth.md`, and `smoke-tests.md`.
3. WHEN a backend rollback is required, THE Deployment_System SHALL support rollback by
   promoting a previous successful Render deployment from the dashboard or by reverting the Git
   commit and pushing to `main` — target rollback time is under 3 minutes.
4. WHEN a frontend rollback is required, THE Deployment_System SHALL support instant promotion
   of a previous Vercel deployment from the dashboard — target rollback time is under 30 seconds.
5. WHEN a database rollback is required, THE Deployment_System SHALL restore from a Supabase
   database backup taken before migrations were applied — the backup SHALL be created via
   `pg_dump` before the Migration_Sequence is run on free tier.
