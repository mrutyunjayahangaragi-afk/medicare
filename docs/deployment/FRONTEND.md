# Frontend Deployment — Vercel

## Connect Repository

1. Go to [vercel.com](https://vercel.com) → New Project → Import from GitHub
2. Select the Medicare repository
3. Because the repo contains both `frontend/` and `backend/`:

| Setting | Value |
|---|---|
| Root Directory | `frontend` |
| Framework Preset | Next.js |
| Install Command | `npm ci` |
| Build Command | `npm run build` |
| Output Directory | *(leave blank — Next.js default)* |

4. Production Branch: `main`

Do **not** configure static export. Medicare uses server rendering, middleware, auth callbacks, and dynamic routes. Static export does not support these.

## Environment Variables

Add in: **Vercel → Project → Settings → Environment Variables**

Set all three to **Production** (and Preview if needed):

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://YOUR_PROJECT.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | your production anon key |
| `NEXT_PUBLIC_SITE_URL` | `https://YOUR-APP.vercel.app` |
| `NEXT_PUBLIC_API_URL` | `https://YOUR-BACKEND.onrender.com` |

**Never add** to Vercel:
- `SUPABASE_SERVICE_ROLE_KEY`
- `GEMINI_API_KEY`
- `HF_TOKEN`
- `GEOAPIFY_API_KEY`
- Google Client Secret
- Any database password

> Changing a Vercel environment variable does not take effect until the next deployment. Trigger a redeploy after updating variables.

## Post-Deploy Verification

```
https://YOUR-APP.vercel.app/                    → landing page (200)
https://YOUR-APP.vercel.app/login               → login page
https://YOUR-APP.vercel.app/auth/callback       → redirect handled
https://YOUR-APP.vercel.app/dashboard           → redirects to /login when unauthenticated
```

Check browser DevTools → Network:
- No requests to `localhost`
- No `http://` resources on an `https://` page (mixed content)
- No CORS errors in console
- No secrets visible in request headers or response bodies

## Content-Security-Policy Note

`next.config.ts` builds the `connect-src` directive at build time from `NEXT_PUBLIC_API_URL`. When that variable is set to the production Render URL, the CSP will contain only the HTTPS backend — not any localhost address. Verify this in the browser → DevTools → Application → Headers after deployment.
