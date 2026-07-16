# OAuth & Auth URL Configuration

## Supabase Auth — Site URL and Redirect URLs

In the Supabase dashboard: **Authentication → URL Configuration**

### Site URL

```
https://YOUR-APP.vercel.app
```

If using a custom domain, use that instead.

### Allowed Redirect URLs

Add these exact values:

```
https://YOUR-APP.vercel.app/auth/callback
https://YOUR-APP.vercel.app/auth/update-password
```

If using a custom domain, also add:

```
https://app.yourdomain.com/auth/callback
https://app.yourdomain.com/auth/update-password
```

Keep `http://localhost:3000/auth/callback` only if still needed for local development.

Supabase validates the `redirectTo` parameter against this list. If the destination is not in the list, the redirect is blocked with an error. Use exact HTTPS URLs — no wildcards, no trailing slashes, no double protocols.

---

## Google OAuth — Google Cloud Console

Go to: **APIs & Services → Credentials → OAuth 2.0 Client IDs → your client**

### Authorized JavaScript Origins

```
https://YOUR-APP.vercel.app
https://YOUR-PROJECT.supabase.co
```

Add custom domain if configured:
```
https://app.yourdomain.com
```

### Authorized Redirect URIs

```
https://YOUR-PROJECT.supabase.co/auth/v1/callback
```

Google redirects through Supabase first — not directly to the frontend. Do not add the Vercel URL as a redirect URI.

Do not add:
- `https://https://...` (doubled protocol)
- `http://` production URLs
- Wildcard URIs (`https://*.vercel.app`)
- Unverified domains

### Update Supabase Google Provider

In Supabase: **Authentication → Providers → Google**

Enter the production Google Client ID and Client Secret.

---

## Production OAuth Tests

Test each portal after configuration:

| Test | Expected result |
|---|---|
| User portal login with Google | Redirect to `/dashboard` |
| Responder portal login with Google | Redirect to `/responder` (if approved) |
| Hospital portal login with Google | Redirect to `/hospital` (if approved) |
| Admin portal login | Admin-specific login flow |
| New hospital application (Google user) | Redirect to `/application-pending` |
| New responder application (Google user) | Redirect to `/application-pending` |
| Logout | Session cleared, redirect to `/login` |
| Refresh a protected page | Session maintained (cookie refresh works) |
| Google user on OTP path | Google users must NOT be sent to OTP verification |
| Portal selection attempt | Role from database, not from URL param |

---

## Email Auth — Forgot Password

The forgot-password flow uses `NEXT_PUBLIC_SITE_URL` as the redirect origin. Verify this is set to the production Vercel URL (not localhost) in the Vercel environment variables.
