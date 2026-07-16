# OAuth Integration Security Review

## Flow Architecture
Medicare uses Supabase Auth as the identity broker, integrating Google OAuth for single-sign-on (SSO).

1. **Authorization Request:** Client initiates auth request through Next.js frontend, redirected to Supabase OAuth endpoint.
2. **Callback Handling:** Supabase handles the token exchange from Google.
3. **Local Profile Creation:** A database trigger catches the new auth user and invokes a function to insert a corresponding row in `public.profiles` with the default `user` role.

## Security Controls Audited

### 1. Redirect URI Validation
- Supabase project settings restrict redirect URIs only to allowed production domains and local development origins (e.g. `http://localhost:3000/*`). This prevents open redirect attacks.

### 2. State & PKCE
- Proof Key for Code Exchange (PKCE) is enabled in the Supabase JS client configuration, preventing authorization code interception attacks.

### 3. Role Assignment
- New signups default strictly to the `user` role. Administrative roles (`admin`, `hospital_staff`) require explicit application and approval workflows. Triggers prevent users from updating their own roles.
