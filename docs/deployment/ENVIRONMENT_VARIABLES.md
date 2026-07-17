# Environment Variables Reference

This document lists every environment variable for both frontend and backend.
No actual secret values are included here.

---

## Frontend (Vercel)

Set in: Vercel → Project → Settings → Environment Variables → Production

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL (`https://xyz.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon/public key |
| `NEXT_PUBLIC_SITE_URL` | Yes | Production frontend URL (`https://YOUR-APP.vercel.app`) — used for forgot-password redirects |
| `NEXT_PUBLIC_API_URL` | Yes | Production backend URL (`https://YOUR-BACKEND.onrender.com`) — no trailing slash |

**Never add to Vercel:**
- `SUPABASE_SERVICE_ROLE_KEY`
- `GEMINI_API_KEY`
- `HF_TOKEN`
- `GEOAPIFY_API_KEY`
- Google Client Secret
- Any database password

---

## Backend (Render)

Set in: Render → Service → Environment

### Application

| Variable | Value | Notes |
|---|---|---|
| `APP_ENV` | `production` | Disables Swagger UI, enables production logging |
| `APP_NAME` | `Medicare API` | Shown in health endpoint |
| `APP_VERSION` | `1.0.0` | Shown in health endpoint |
| `DEBUG` | `false` | Must be false in production |
| `API_V1_PREFIX` | `/api/v1` | Route prefix |

### CORS

| Variable | Value | Notes |
|---|---|---|
| `BACKEND_CORS_ORIGINS` | `["https://YOUR-APP.vercel.app"]` | JSON array. Add custom domain when configured. Never use `*` |
| `FRONTEND_URL` | `https://YOUR-APP.vercel.app` | Legacy display field |

### Supabase

| Variable | Source | Notes |
|---|---|---|
| `SUPABASE_URL` | Supabase → Project Settings → API | Required — server fails to start without it |
| `SUPABASE_ANON_KEY` | Supabase → Project Settings → API | Required |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API | Required — **never expose to frontend** |

### AI / Gemini

| Variable | Value | Notes |
|---|---|---|
| `GEMINI_API_KEY` | Google AI Studio | Required. Must start with `AIza`. Get from [aistudio.google.com](https://aistudio.google.com/app/apikey) |
| `GEMINI_MODEL` | `gemini-2.5-flash` | Tested and confirmed model name |
| `AI_PROVIDER` | `gemini` | |
| `AI_ASSISTANT_ENABLED` | `true` | |
| `AI_REQUEST_TIMEOUT_SECONDS` | `30` | |
| `AI_MAX_INPUT_CHARACTERS` | `4000` | |
| `AI_MAX_HISTORY_MESSAGES` | `12` | |
| `AI_TEMPERATURE` | `0.2` | |
| `AI_RATE_LIMIT_PER_MINUTE` | `10` | |
| `AI_RATE_LIMIT_PER_DAY` | `100` | |
| `AI_CONVERSATION_RETENTION_DAYS` | `30` | |

### Hugging Face (disabled)

| Variable | Value | Notes |
|---|---|---|
| `HF_PROVIDER_ENABLED` | `false` | Keep false unless explicitly enabling HF |
| `HF_TOKEN` | *(empty)* | Not needed when disabled |
| `HF_CHAT_MODEL` | *(empty)* | Not needed when disabled |
| `HF_INTENT_MODEL` | *(empty)* | Not needed when disabled |

### ML Severity

| Variable | Value | Notes |
|---|---|---|
| `ML_SEVERITY_ENABLED` | `true` | Enables the scikit-learn pipeline |
| `ML_SEVERITY_CONFIDENCE_THRESHOLD` | `0.65` | Below this, `low_confidence=true` flag is set |
| `HF_SEVERITY_ENABLED` | `false` | Keep false unless explicitly enabling HF zero-shot |

### Geoapify

| Variable | Value | Notes |
|---|---|---|
| `GEOAPIFY_ENABLED` | `true` | Enables nearby services endpoint |
| `GEOAPIFY_API_KEY` | Geoapify developer dashboard | **Backend-only** — never expose to frontend |
| `GEOAPIFY_TIMEOUT_SECONDS` | `10` | |

---

## Critical Production Checklist

### Render Dashboard (set these manually under Service → Environment)

```
SUPABASE_URL=https://qcwhylpizgilgfsjexxa.supabase.co
SUPABASE_ANON_KEY=<anon key from Supabase dashboard>
SUPABASE_SERVICE_ROLE_KEY=<service role key from Supabase dashboard>
GEMINI_API_KEY=<valid key starting with AIza from aistudio.google.com>
GEOAPIFY_API_KEY=<key from developer.geoapify.com>
BACKEND_CORS_ORIGINS=["https://medicare-nine-lilac.vercel.app","http://localhost:3000"]
FRONTEND_URL=https://medicare-nine-lilac.vercel.app
```

### Vercel Dashboard (set under Project → Settings → Environment Variables → Production)

```
NEXT_PUBLIC_SUPABASE_URL=https://qcwhylpizgilgfsjexxa.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
NEXT_PUBLIC_SITE_URL=https://medicare-nine-lilac.vercel.app
NEXT_PUBLIC_API_URL=https://medicare-backend-u3k3.onrender.com
```

### Common Mistakes That Break Production

| Symptom | Root cause | Fix |
|---|---|---|
| AI Assistant "temporarily unavailable" | `GEMINI_API_KEY` not set or invalid on Render | Set a valid `AIza...` key |
| Nearby services blank / 503 | `GEOAPIFY_API_KEY` not set on Render | Set the API key in Render dashboard |
| CORS errors in browser | `BACKEND_CORS_ORIGINS` missing Vercel URL | Set `["https://medicare-nine-lilac.vercel.app"]` on Render |
| Frontend calls localhost in prod | `NEXT_PUBLIC_API_URL` not set on Vercel | Add the Render backend URL to Vercel env vars |
| Supabase client init fails | Leading space in `NEXT_PUBLIC_SUPABASE_URL` | Ensure no whitespace around the value |
| Notifications never appear | Demo seed not run | Run `python scripts/seed_notifications.py` from backend/ |
