# Deployment Troubleshooting

## Backend (Render)

### Service fails to start — `missing required env var`

Config.py validates `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` at startup. All three must be set in Render environment variables. Check for typos in key names — pydantic-settings is case-insensitive but the key names must match.

### Service fails to start — `ModuleNotFoundError`

The build command must run before the start command. Check Render's build logs. Common causes:
- `requirements-ml.txt` not installed — check the `if [ -f requirements-ml.txt ]` conditional
- Python version mismatch — verify `.python-version` says `3.13`

### 502 Bad Gateway after deploy

Render may still be starting the service. Wait up to 60 seconds, then check the health endpoint. If it remains 502, check the Render logs for startup errors.

### CORS error in browser console

```
Access to fetch ... blocked by CORS policy
```

`BACKEND_CORS_ORIGINS` in Render must exactly match the frontend origin including protocol and without a trailing slash:

```
["https://medicare-xyz.vercel.app"]
```

If using a custom domain, add it to the array:
```
["https://medicare-xyz.vercel.app","https://app.yourdomain.com"]
```

### ML model loading warning (`InconsistentVersionWarning`)

Scikit-learn version mismatch between training (1.8) and serving (1.9) environments. The tests pass and the model loads. This is a warning, not an error. Retrain the model using the same scikit-learn version as `requirements-ml.txt` specifies to eliminate the warning.

---

## Frontend (Vercel)

### Build fails — `EPERM rmdir`

A stale `.next` cache directory. Delete it locally before committing:

```bash
Remove-Item -Recurse -Force frontend/.next
```

If it fails on Vercel, configure a clean build by setting the build cache as invalid in Vercel → Deployments → Redeploy → Clear Build Cache.

### `undefined/api/v1/...` in network requests

`NEXT_PUBLIC_API_URL` is not set in Vercel environment variables. The code falls back to `http://localhost:8000`. Add the variable and redeploy.

### Mixed content error

Frontend at `https://...` is making requests to `http://...`. This means `NEXT_PUBLIC_API_URL` is set to an `http://` URL. Change it to `https://`.

### Hydration errors

Usually caused by date/time rendering differences between server and client. These are pre-existing and not introduced by the deployment. `suppressHydrationWarning` is already set on `<body>` in `app/layout.tsx` for intentional differences.

### Auth callback `redirect_uri_mismatch`

The Supabase redirect URL is not in the allowed list. In Supabase → Authentication → URL Configuration, verify the exact production URL is listed (e.g. `https://medicare-xyz.vercel.app/auth/callback`).

---

## Google OAuth

### `Error 400: redirect_uri_mismatch`

The redirect URI in Google Cloud Console does not match. Check that `https://YOUR_PROJECT.supabase.co/auth/v1/callback` is in the **Authorized redirect URIs** list (not Authorized JavaScript origins).

### Google login works in dev but not production

1. Verify production Supabase Site URL is set (not `http://localhost:3000`)
2. Verify the Vercel domain is in Google's Authorized JavaScript origins
3. Verify the Supabase project URL is in Google's Authorized JavaScript origins
4. Check Supabase → Authentication → Providers → Google has the correct production Client ID/Secret

---

## Supabase

### RLS blocks legitimate requests

Check if the calling token has the correct role. The backend uses the service role key for admin operations that bypass RLS. The frontend anon key is subject to RLS. If an expected query returns zero rows, verify the RLS policy for that role.

### Realtime not receiving events

1. Confirm the table is in the `supabase_realtime` publication
2. Confirm the channel is subscribed before the event fires
3. Check browser → Network → WebSocket frames for error messages
4. Verify the user's JWT is valid (not expired) when subscribing

### Migration fails on production

Read the error message carefully. Common causes:
- Table or column already exists (idempotency issue) — add `IF NOT EXISTS` or `IF EXISTS` guards
- Function signature mismatch — drop the old function first or use `CREATE OR REPLACE`
- Permission denied — run the migration as the `postgres` role in Supabase SQL editor

---

## ML Severity

### `GET /api/v1/ml/severity/health` returns 503

Artifacts are missing from `backend/ml/severity/artifacts/`. Verify they are committed to Git. Check Render's build logs to confirm the repo was cloned successfully.

### `InconsistentVersionWarning` in production logs

Not a blocking issue — see note under Backend section above.

---

## Free-Tier Cold Start

Render free services spin down after inactivity. First request after spin-down takes ~30 seconds. Users will see a loading state. Options:
- Upgrade to a paid Render instance type (eliminates cold starts)
- Use an external uptime monitor (e.g., UptimeRobot) to ping the health endpoint every 14 minutes
- Document the expected behavior for users
