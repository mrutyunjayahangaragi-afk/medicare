# Medicare Backend

FastAPI backend foundation for the Medicare emergency assistance platform.

---

## Requirements

- Python 3.11 or 3.12+ (3.14 confirmed working)
- pip 24+
- A Supabase project with anon + service-role keys

---

## Quick Start

### 1. Create and activate the virtual environment

```bash
cd backend
python -m venv .venv
```

**Windows PowerShell:**
```powershell
.\.venv\Scripts\Activate.ps1
# If blocked:
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
```

**Windows CMD:**
```cmd
.venv\Scripts\activate.bat
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` and fill in your Supabase credentials:

```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

> **Never commit `.env`** — it is in `.gitignore`.  
> **Never prefix backend secrets with `NEXT_PUBLIC_`.**

### 4. Start the development server

```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

---

## API Routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Welcome + navigation links |
| GET | `/api/v1/health` | Health check |
| GET | `/docs` | Swagger UI (development) |
| GET | `/redoc` | ReDoc UI (development) |
| GET | `/openapi.json` | OpenAPI schema |

### Health check response

```json
{
  "status": "healthy",
  "app": "Medicare API",
  "version": "1.0.0",
  "environment": "development"
}
```

---

## Running Tests

```bash
pytest -v
```

Expected output:

```
tests/test_health.py::TestRootEndpoint::test_root_returns_200         PASSED
tests/test_health.py::TestRootEndpoint::test_root_contains_message    PASSED
tests/test_health.py::TestHealthEndpoint::test_health_returns_200     PASSED
tests/test_health.py::TestHealthEndpoint::test_health_status_is_healthy PASSED
...
```

---

## Verify imports

```bash
python -m compileall app
```

---

## Project Structure

```
backend/
├── app/
│   ├── main.py              # FastAPI app factory, CORS, lifespan
│   ├── api/
│   │   └── v1/
│   │       ├── api.py       # Central v1 router
│   │       └── routes/
│   │           └── health.py
│   ├── core/
│   │   ├── config.py        # Pydantic-settings configuration
│   │   ├── exceptions.py    # Global exception handlers
│   │   └── logging.py       # Structured logging setup
│   ├── db/
│   │   └── supabase.py      # Supabase client factory (anon + admin)
│   ├── models/              # SQLAlchemy / ORM models (Step 13+)
│   ├── schemas/
│   │   └── common.py        # Shared Pydantic response models
│   ├── services/            # Business-logic classes (Step 13+)
│   └── utils/               # Utility helpers
├── tests/
│   ├── conftest.py          # Shared fixtures
│   └── test_health.py       # Root + health-check tests
├── .env                     # Local secrets (git-ignored)
├── .env.example             # Safe template (committed)
├── .gitignore
├── pyproject.toml           # Pytest configuration
├── requirements.txt         # Pinned dependencies
└── README.md
```

---

## Frontend Integration

Add to `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

A typed helper at `frontend/lib/api/client.ts` calls the health endpoint
to confirm connectivity.

---

## Security Notes

- `SUPABASE_SERVICE_ROLE_KEY` is **never** returned to clients or logged.
- CORS is restricted to an explicit list of frontend origins.
- No wildcard CORS with `allow_credentials=True`.
- Raw tracebacks are never returned in API responses.
- Supabase Row-Level Security is preserved for anon-key operations.
- The service-role client bypasses RLS — use only for trusted server-side logic.

---

## Future Steps

| Step | Feature |
|------|---------|
| 13 | Database architecture (migrations, models) |
| 14 | Emergency request APIs |
| 15 | AI/Gemini triage |
| 16 | Responder coordination |
| 17 | Notifications |
| 18 | Analytics |
