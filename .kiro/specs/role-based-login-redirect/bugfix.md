# Bugfix Requirements Document

## Introduction

After successful authentication, the Medicare application redirects all users to `/dashboard` regardless of their actual database role. The role selector on the login page (User / Admin / Hospital / Responder) and hardcoded redirect strings influence the destination instead of the authenticated user's real role from `public.profiles.role` in Supabase. This causes admin accounts to land on the normal user dashboard, hospital/responder accounts to bypass their portals, and creates a pathway where frontend-supplied role metadata can determine access — a security concern in a healthcare emergency platform.

The role is stored in `public.profiles.role` (enum: `user`, `responder`, `volunteer`, `hospital_staff`, `hospital`, `admin`). The fix must ensure every post-authentication redirect is driven exclusively by a fresh query to that column.

---

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a user with `profiles.role = 'admin'` completes email/password authentication THEN the system redirects to `/dashboard` instead of `/admin` because the redirect uses the frontend-selected portal value rather than the database role.

1.2 WHEN a Google OAuth user completes authentication through `/auth/callback` and no `portal` query param matches their DB role THEN the system defaults to redirecting to `/dashboard` even if the user holds an elevated role such as `admin`, `hospital_staff`, or `responder`.

1.3 WHEN the login page role selector is set to `Admin` but the authenticated account has `profiles.role = 'user'` THEN the system does not display a role mismatch error and may still attempt to route toward `/admin` based on the selector value.

1.4 WHEN role data exists in `localStorage`, `sessionStorage`, or a stale React context cache from a previous session THEN the system uses those stale values to determine the redirect destination instead of fetching a fresh profile.

1.5 WHEN a user navigates directly to `/admin` or any `/admin/*` route and their session has a non-admin role THEN the system does not reliably redirect them away because route protection depends on client-side checks that may use cached or selector-derived role state.

1.6 WHEN the `public.profiles` row is missing for an authenticated user THEN the system silently defaults to the `user` role and redirects to `/dashboard` without logging the anomaly, masking a data integrity problem.

1.7 WHEN a hospital or responder account has a `pending` or `rejected` application status THEN the system does not consistently redirect them to `/portal-status` and may send them to `/dashboard` or the wrong portal.

1.8 WHEN navigation UI components render role-specific menu items THEN the system may display incorrect navigation (e.g., admin nav items for a regular user) because the rendered role is sourced from the login selector or a cached value rather than the resolved database role.

---

### Expected Behavior (Correct)

2.1 WHEN a user with `profiles.role = 'admin'` completes email/password authentication THEN the system SHALL fetch `profiles.role` via `supabase.auth.getUser()` + a fresh DB query, resolve the role to `admin`, and redirect to `/admin`.

2.2 WHEN a Google OAuth user completes authentication through `/auth/callback` THEN the system SHALL resolve the authenticated user's real role from `public.profiles.role` after `exchangeCodeForSession()` and redirect to the correct portal (`/admin`, `/hospital`, `/responder`, or `/dashboard`) regardless of any `portal` query param.

2.3 WHEN the login page role selector value does not match the authenticated user's `profiles.role` THEN the system SHALL display an appropriate inline error message (e.g., "This account does not have administrator access.") and redirect the user to their actual role-based dashboard path, without writing any value to `profiles.role`.

2.4 WHEN post-login role resolution executes THEN the system SHALL clear any role-related entries from `localStorage` and `sessionStorage`, invalidate stale React context or query cache for the profile, and call `router.refresh()` to ensure server components re-render with the fresh session.

2.5 WHEN an unauthenticated request reaches `/admin` or any `/admin/*` route THEN the system SHALL redirect server-side to `/login?next=/admin`. When an authenticated non-admin request reaches those routes THEN the system SHALL redirect server-side to `/unauthorized`. When an authenticated admin request reaches those routes THEN the system SHALL allow access. These checks MUST be performed server-side only.

2.6 WHEN the `public.profiles` row is missing for an authenticated user THEN the system SHALL create the missing profile row (defaulting `role` to `user`), log a warning in development (`console.warn` with `userId`), and never silently swallow the error.

2.7 WHEN a hospital or responder account has `application_status = 'pending'` or `'rejected'` THEN the system SHALL redirect to `/portal-status`. WHEN the account is `approved` (role is `hospital_staff`/`hospital`/`responder`/`volunteer`) THEN the system SHALL redirect to `/hospital` or `/responder` respectively.

2.8 WHEN navigation UI components render THEN the system SHALL derive the displayed navigation items exclusively from the resolved database role returned by `getUserAccess()`, not from the login selector, `localStorage`, or any client-supplied metadata.

2.9 WHEN `getUserAccess()` runs in development mode THEN the system SHALL log `{ userId, role, dashboardPath }` to the console and SHALL NOT log session tokens or access keys.

2.10 WHEN a `UserAccess` object is constructed THEN the system SHALL use the single canonical resolver at `frontend/lib/auth/get-user-access.ts`, which returns `{ userId, role, applicationStatus?, organizationId?, dashboardPath }`, and this SHALL be the only place that maps role values to dashboard paths.

---

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a user with `profiles.role = 'user'` successfully completes email/password authentication THEN the system SHALL CONTINUE TO redirect to `/dashboard` after role resolution confirms the `user` role.

3.2 WHEN a user with `profiles.role = 'user'` successfully completes Google OAuth authentication THEN the system SHALL CONTINUE TO redirect to `/dashboard` after role resolution in `/auth/callback`.

3.3 WHEN a responder account with an `approved` application status completes authentication THEN the system SHALL CONTINUE TO redirect to `/responder` as it currently does for elevated roles.

3.4 WHEN a hospital staff account with an `approved` application status completes authentication THEN the system SHALL CONTINUE TO redirect to `/hospital` as it currently does for elevated roles.

3.5 WHEN an authenticated admin visits any `/admin/*` route THEN the system SHALL CONTINUE TO allow access and render the admin layout and sidebar correctly.

3.6 WHEN authentication fails (wrong password, unconfirmed email, etc.) THEN the system SHALL CONTINUE TO display the existing error message via `getAuthErrorMessage()` and remain on the login page without redirecting.

3.7 WHEN a new user signs up via Google OAuth for the first time THEN the system SHALL CONTINUE TO create a `profiles` row with `role = 'user'` via the `on_auth_user_created` trigger and redirect to `/dashboard`.

3.8 WHEN a hospital or responder applicant signs in for the first time after submitting an application THEN the system SHALL CONTINUE TO redirect to `/application-pending` or `/application-rejected` based on their `portal_applications.status`.

3.9 WHEN the `protect_profile_auth_fields` database trigger is in effect THEN the system SHALL CONTINUE TO prevent any client-side Supabase call from modifying `profiles.role`, `organization_id`, `responder_type`, or `is_verified` for the authenticated user's own row.

3.10 WHEN a valid `?next=` parameter is present and the authenticated user's resolved role is authorized for that path THEN the system SHALL CONTINUE TO honour the `next` redirect after confirming role authorization server-side.
