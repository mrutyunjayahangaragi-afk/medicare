# Backend Deployment — Render

## Create a Web Service

1. Go to [render.com](https://render.com) → New → Web Service
2. Connect the Medicare GitHub repository
3. Configure:

| Setting | Value |
|---|---|
| Root Directory | `backend` |
| Runtime | Python |
| Build Command | See below |
| Start Command | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| Health Check Path | `/api/v1/health` |
| Auto Deploy | Enable for `main` branch |

### Build Command

```bash
pip install --upgrade pip && \
pip install -r requirements.txt && \
if [ -f requirements-ml.txt ]; then pip install -r requirements-ml.txt; fi
```

## Python Version

The backend uses Python 3.13 (declared in `backend/.python-version`).

Render reads `.python-version` automatically. If Render does not detect it, set the `PYTHON_VERSION` environment variable to `3.13` in the Render dashboard.

Python 3.14 is the local development version but may not be available on Render's build infrastructure. 3.13 is stable and supported by all project dependencies.

## PORT Variable

Render injects `$PORT` at runtime. The start command uses `--port $PORT`. Never hardcode `8000` in the start command for production.

## ML Model Artifacts

The trained model lives at `backend/ml/severity/artifacts/` and is committed to the repository. Render clones the repo on each deploy, so artifacts are available automatically.

The `model_registry.py` uses `Path(__file__).parent.parent / "artifacts"` — a path relative to the Python source file, which works correctly on the Linux Render filesystem.

If artifacts are ever excluded from Git, add a build step to download them and verify checksums before the server starts.

## Swagger / ReDoc

Interactive API docs are disabled in production (`app_env=production`). The `/docs`, `/redoc`, and `/openapi.json` endpoints return 404 in production. This is intentional — it reduces the attack surface.

To re-enable for a demo, temporarily set `APP_ENV=development` in Render env vars and redeploy. Re-disable before handoff.

## Health Check Verification

After deployment:

```
GET https://YOUR-BACKEND.onrender.com/
GET https://YOUR-BACKEND.onrender.com/api/v1/health
```

Expected health response:
```json
{
  "status": "healthy",
  "app": "Medicare API",
  "version": "1.0.0",
  "environment": "production"
}
```

Verify 401 responses (no data leak) on authenticated endpoints:
```
GET https://YOUR-BACKEND.onrender.com/api/v1/emergency-requests    → 401
GET https://YOUR-BACKEND.onrender.com/api/v1/admin/applications    → 401
GET https://YOUR-BACKEND.onrender.com/api/v1/responder/requests/available → 401
GET https://YOUR-BACKEND.onrender.com/api/v1/hospital/dashboard    → 401
```

## Free-Tier Notes

On Render's free tier:
- Services spin down after 15 minutes of inactivity (cold start ~30 s)
- 512 MB RAM — the ML model pipeline loads into memory on first prediction (~50 MB)
- 0.1 CPU — concurrent requests may queue during cold start
- No persistent disk — artifacts must be in the repo or downloaded at build time

Upgrade to a paid instance type for production-grade availability.
