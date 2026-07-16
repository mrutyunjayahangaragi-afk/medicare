# Medicare — Production Deployment Guide

## Architecture

| Layer | Service | URL pattern |
|---|---|---|
| Frontend | Vercel | `https://medicare-xyz.vercel.app` |
| Backend | Render | `https://medicare-api-xyz.onrender.com` |
| Database / Auth / Storage / Realtime | Supabase | `https://xyz.supabase.co` |

## Deployment Order

Follow this order exactly. Deploying the frontend before the backend exists will leave it pointing at a URL that does not yet return 200.

1. Push a clean production commit to `main`
2. Deploy backend to Render → verify `/api/v1/health`
3. Apply Supabase migrations → verify tables, RLS, RPC
4. Configure Supabase Auth production Site URL and redirect URLs
5. Configure Google OAuth (origins + redirect URI)
6. Deploy frontend to Vercel with `NEXT_PUBLIC_API_URL` pointing at the live Render URL
7. Run production smoke tests (see `POST_DEPLOYMENT_TESTING.md`)
8. Configure custom domain only after hosted URLs are confirmed working

## Document Index

| File | Contents |
|---|---|
| `FRONTEND.md` | Vercel setup, root directory, env vars |
| `BACKEND.md` | Render setup, build command, start command |
| `SUPABASE.md` | Migrations, RLS, RPC, Storage, Realtime |
| `OAUTH.md` | Google OAuth + Supabase Auth URL configuration |
| `ENVIRONMENT_VARIABLES.md` | Complete env-var reference (keys only) |
| `STORAGE.md` | Bucket policies, access rules |
| `REALTIME.md` | Publication entries, channel authorization |
| `POST_DEPLOYMENT_TESTING.md` | Smoke test checklist |
| `ROLLBACK.md` | Frontend, backend, database rollback procedures |
| `TROUBLESHOOTING.md` | Common failures and resolutions |

## Pre-Deployment Checklist

Run these before every production deployment. Do not deploy if any command fails.

```bash
# Frontend
cd frontend
npm ci
npx tsc --noEmit
npm run build
npm audit

# Backend
cd backend
pip install -r requirements.txt
pip install -r requirements-ml.txt
python -m compileall app
pytest -v
pip check

# Supabase (requires Supabase CLI)
supabase db lint
supabase migration list
```

## Secret Exposure Check

Run before every commit:

```bash
# From repo root
git grep -rn "supabase_service_role_key\|SUPABASE_SERVICE_ROLE_KEY" -- "*.ts" "*.tsx" "*.py" "*.json"
git grep -rn "AIza"
git grep -rn "hf_[A-Za-z]"
```

Expected result: zero matches in source files. Only `.env.example` placeholder text is acceptable.
