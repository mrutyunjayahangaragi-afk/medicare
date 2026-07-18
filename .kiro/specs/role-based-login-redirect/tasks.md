# Implementation Plan

## Overview

This task list implements the role-based login redirect bugfix using the exploratory bug condition methodology. Tasks are ordered: exploration test → preservation tests → implementation → verification. The core change is introducing `getUserAccess` as the single canonical resolver for all post-authentication redirects, replacing three diverging inline role-mapping paths.

## Tasks

- [ ] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Role Redirect Bug (Wrong Portal After Login)
  - **CRITICAL**: This test MUST FAIL on unfixed code — failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior — it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate that `profiles.role` is not the sole driver of the post-login redirect destination
  - **Scoped PBT Approach**: For each NormalizedRole value (`admin`, `hospital_staff`, `responder`, `volunteer`, `user`), assert that `getRoleDashboardPath(role)` returns the correct path AND that this is the only path used. Scope to concrete failing cases: verify `LoginForm.onEmailLogin` with `profiles.role = 'admin'` produces `/admin`, not `/dashboard`.
  - Install `fast-check` as a dev dependency: `npm install --save-dev fast-check`
  - Create `frontend/lib/auth/__tests__/get-user-access.bug-condition.test.ts`
  - Import `fc` from `fast-check` and the existing `getRoleDashboardPath` from `get-user-role.ts` (the pre-fix module to verify the mapping contract)
  - Write property: `fc.property(fc.constantFrom('admin','hospital_staff','hospital','responder','volunteer','user'), role => getRoleDashboardPath(role).startsWith('/'))`
  - Write property: for all `NormalizedRole` values, `getRoleDashboardPath` returns a path that is NOT `/dashboard` for elevated roles — i.e., `admin` → `/admin`, `hospital_staff` → `/hospital`, `responder` → `/responder`, `volunteer` → `/responder`
  - Write a concrete unit test asserting `getRoleDashboardPath('admin') === '/admin'` — this already passes (the bug is upstream in `LoginForm` and `callback/route.ts`, not in `getRoleDashboardPath` itself)
  - Write a concrete unit test that simulates the **buggy** `LoginForm` inline mapping: given `profile.role = 'admin'`, the inline `if/else` chain produces `/admin` (document this to compare with callback bug)
  - Write a concrete test for the **buggy** `resolveUserPortal` in `callback/route.ts`: when `requestedPortal = 'user'` and `profiles.role = 'admin'`, the function returns `authorizedPortal = 'admin'` — BUT the outer code checks `resolution.authorizedPortal === requestedPortal` (`'admin' !== 'user'`), so it falls through to a secondary branch. Document the counterexample: `(requestedPortal='user', role='admin') → redirects to /admin` (resolves correctly here by luck) vs `(requestedPortal='admin', role='user') → may route toward /admin`
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: The property test for the callback `portal` param override FAILS — confirming the bug exists
  - Document counterexamples found (e.g., "Google OAuth with `?portal=admin` and `profiles.role='user'` steers toward `/admin` branch")
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 1.3_

- [ ] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Non-Elevated Role Redirect Behavior
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for non-buggy inputs (cases where the portal selector matches the DB role)
  - Observe: `LoginForm.onEmailLogin` with `profiles.role = 'user'` and `selectedPortal = 'user'` redirects to `/dashboard` ✓
  - Observe: `LoginForm.onEmailLogin` with `profiles.role = 'responder'` and `selectedPortal = 'responder'` redirects to `/responder` ✓
  - Observe: `callback/route.ts` with `profiles.role = 'user'` and no `portal` param redirects to `/dashboard` ✓
  - Observe: `getRoleDashboardPath('user')` returns `/dashboard`, `getRoleDashboardPath('admin')` returns `/admin`
  - Create `frontend/lib/auth/__tests__/storage.preservation.test.ts`
  - Write property-based test using `fast-check`: for all role values in `NormalizedRole`, `getRoleDashboardPath(role)` always returns a non-empty string starting with `/`
  - Write property: `isNextAuthorized(next, role) === false` for all `next` paths not matching the role's portal (e.g., `/admin` for `user` role, `/hospital` for `admin` role) — verify this covers 4×5 role/path combinations
  - Write property: `isNextAuthorized` is `true` only when `next` prefix matches the canonical path for `role` (e.g., `next='/admin/dashboard'`, `role='admin'` → `true`)
  - Write unit tests: `clearRoleStorage` removes all keys (`userRole`, `portal`, `selectedPortal`, `loginPortal`, `role`) from both `localStorage` and `sessionStorage` mocks
  - Run tests on UNFIXED code (against existing `getRoleDashboardPath` from `get-user-role.ts`)
  - **EXPECTED OUTCOME**: Tests PASS on unfixed code (confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.10_

- [ ] 3. Create canonical resolver `frontend/lib/auth/get-user-access.ts`

  - [ ] 3.1 Create `UserAccess` type and `NormalizedRole` type
    - Create `frontend/lib/auth/get-user-access.ts`
    - Export `NormalizedRole` union type: `'admin' | 'hospital_staff' | 'responder' | 'volunteer' | 'user'`
    - Export `UserAccess` interface: `{ userId: string; role: NormalizedRole; applicationStatus?: ApplicationStatus; organizationId?: string; dashboardPath: string }`
    - Import `ApplicationStatus` from `@/types/auth`
    - _Requirements: 2.10_

  - [ ] 3.2 Implement `getRoleDashboardPath`
    - Export `getRoleDashboardPath(role: NormalizedRole | string | null): string`
    - Map `'admin'` → `/admin`, `'hospital_staff'` / `'hospital'` (legacy alias) → `/hospital`, `'responder'` / `'volunteer'` → `/responder`, default → `/dashboard`
    - This is the single canonical mapping; all other copies must be removed after implementation
    - _Bug_Condition: isBugCondition(input) where multiple callers implement diverging role→path mappings_
    - _Expected_Behavior: every call site produces identical path for the same role_
    - _Requirements: 2.10_

  - [ ] 3.3 Implement `getUserAccess`
    - Export `async function getUserAccess(supabase: SupabaseClient, userId: string): Promise<UserAccess>`
    - Step 1: Query `profiles` for `role` and `organization_id`
    - Step 2: If row is missing, upsert `{ id: userId, role: 'user', is_verified: false, updated_at: new Date().toISOString() }` with `onConflict: 'id'`; emit `console.warn('[getUserAccess] missing profile, created default', { userId })` in dev; set `profile = { role: 'user', organization_id: null }`
    - Step 3: Normalize raw DB role string to `NormalizedRole` (`'hospital'` alias → `'hospital_staff'`)
    - Step 4: For elevated roles (`!== 'user'`), derive `dashboardPath` from `getRoleDashboardPath(role)` and return early
    - Step 5: For `user` role, query `portal_applications` ordered by `created_at DESC` limited to 1; set `dashboardPath` based on `app.status` (`pending` → `/application-pending`, `rejected` → `/application-rejected`, `suspended` → `/login?error=suspended`)
    - Dev-mode `console.log('[getUserAccess]', { userId, role, dashboardPath })` — never log tokens
    - _Bug_Condition: isBugCondition(input) where redirect path derived from portal selector or stale cache instead of DB_
    - _Expected_Behavior: dashboardPath === getRoleDashboardPath(role) for all elevated roles; user role with pending app → /application-pending_
    - _Preservation: user with role='user' and no app still gets /dashboard_
    - _Requirements: 2.1, 2.2, 2.6, 2.7, 2.9, 2.10_

- [ ] 4. Create storage helpers `frontend/lib/auth/storage.ts`

  - [ ] 4.1 Implement `clearRoleStorage`
    - Create `frontend/lib/auth/storage.ts`
    - Define `ROLE_STORAGE_KEYS = ['userRole', 'portal', 'selectedPortal', 'loginPortal', 'role']`
    - Export `clearRoleStorage(): void` — guard with `typeof window === 'undefined'`; iterate keys, call `localStorage.removeItem(k)` and `sessionStorage.removeItem(k)` for each
    - _Requirements: 2.4_

  - [ ] 4.2 Implement `isNextAuthorized`
    - Export `isNextAuthorized(next: string, role: NormalizedRole): boolean`
    - `/admin` prefix → `role === 'admin'`
    - `/hospital` prefix → `role === 'hospital_staff'`
    - `/responder` prefix → `role === 'responder' || role === 'volunteer'`
    - `/dashboard` prefix → `role === 'user'`
    - All other paths → `false`
    - Import `NormalizedRole` from `./get-user-access`
    - _Bug_Condition: isBugCondition(input) where ?next=/admin is honored for non-admin role_
    - _Expected_Behavior: isNextAuthorized('/admin', 'user') === false_
    - _Preservation: isNextAuthorized('/admin', 'admin') === true_
    - _Requirements: 2.5, 3.10_

- [ ] 5. Create Server Action `frontend/app/actions/auth.ts`

  - [ ] 5.1 Create thin server action wrapping `getUserAccess`
    - Create `frontend/app/actions/auth.ts`
    - Add `'use server'` directive at top
    - Import `createClient` from `@/lib/supabase/server`
    - Import `getUserAccess`, `UserAccess` from `@/lib/auth/get-user-access`
    - Export `async function fetchUserAccess(): Promise<UserAccess>`
    - Inside: call `await createClient()`, call `supabase.auth.getUser()`, throw if no user, then call and return `getUserAccess(supabase, user.id)`
    - This is the only way `LoginForm` (a client component) may invoke the server-side resolver
    - _Requirements: 2.1, 2.10_

- [ ] 6. Update `frontend/components/auth/LoginForm.tsx`

  - [ ] 6.1 Remove inline role mapping and add `fetchUserAccess` call
    - Import `fetchUserAccess` from `@/app/actions/auth`
    - Import `clearRoleStorage`, `isNextAuthorized` from `@/lib/auth/storage`
    - Import `NormalizedRole` from `@/lib/auth/get-user-access`
    - In `onEmailLogin`, after `supabase.auth.getUser()` succeeds, **remove** the `supabase.from('profiles').select('role')` client query
    - **Remove** the inline `let destination: string; if (role === 'admin') ...` chain
    - **Replace** with `const access = await fetchUserAccess()`
    - _Bug_Condition: isBugCondition(input) where inline mapping diverges from canonical resolver_
    - _Requirements: 2.1, 2.10_

  - [ ] 6.2 Add portal mismatch check and inline error
    - After `fetchUserAccess()` resolves, define `portalToRoles` map: `{ admin: ['admin'], hospital: ['hospital_staff'], responder: ['responder','volunteer'], user: ['user'] }`
    - If `!portalToRoles[selectedPortal]?.includes(access.role)`, call `setError(messages[selectedPortal] ?? 'Portal mismatch. Redirecting to your portal.')`
    - Error messages per portal: `admin` → `'This account does not have administrator access.'`, `hospital` → `'This account is not registered as hospital staff.'`, `responder` → `'This account is not registered as a responder.'`, `user` → `'This account has elevated access. Redirecting to your portal.'`
    - Do NOT return early — still redirect below after showing the error
    - _Bug_Condition: isBugCondition(input) where mismatch is not surfaced to the user_
    - _Requirements: 2.3_

  - [ ] 6.3 Clear storage and handle `?next=` redirect
    - Call `clearRoleStorage()` before `router.push`
    - Set `let destination = access.dashboardPath`
    - Read `rawNext` from `searchParams.get('next')`
    - If `rawNext` is non-null and `isNextAuthorized(rawNext, access.role)` is `true`, override `destination = rawNext`
    - Call `router.push(destination)` then `router.refresh()`
    - **Remove** the existing `nextUrl` / `rawNext` inline logic that duplicates `isNextAuthorized`
    - Update the Google OAuth `redirectTo` to remove `?portal=${selectedPortal}` — pass only `?type=` if applicable (leave Google button URL clean so callback won't read a portal hint)
    - _Bug_Condition: isBugCondition(input) where stale localStorage role survives across sessions_
    - _Preservation: user role 'user' still reaches /dashboard; ?next= honoured when authorized_
    - _Requirements: 2.4, 2.5, 3.1, 3.10_

- [ ] 7. Update `frontend/app/auth/callback/route.ts`

  - [ ] 7.1 Replace `resolveUserPortal` with `getUserAccess`
    - Import `getUserAccess` from `@/lib/auth/get-user-access`
    - **Remove** the `resolveUserPortal` inline function entirely
    - After `supabase.auth.getUser()` succeeds and the profile upsert for new users is complete, call `const access = await getUserAccess(supabase, user.id)`
    - **Remove** all `requestedPortal` branching that steers the redirect; the `portal` query param must no longer influence `dashboardPath`
    - Keep `registrationType` (`?type=`) handling intact: if `registrationType === 'hospital' || 'responder'`, call `createApplication` and redirect to `/application-pending`
    - Redirect: `return NextResponse.redirect(\`\${origin}\${access.dashboardPath}\`)`
    - Remove the `existing` profile check / early upsert block for new users: `getUserAccess` handles the missing-row upsert internally; simplify to: exchange code → getUser → (handle `?type=` registration) → `getUserAccess` → redirect
    - _Bug_Condition: isBugCondition(input) where ?portal= query param overrides DB role in redirect_
    - _Expected_Behavior: Google OAuth with ?portal=admin and profiles.role='user' redirects to /dashboard_
    - _Preservation: Google OAuth as user role still reaches /dashboard; hospital/responder applicants still reach /application-pending_
    - _Requirements: 2.2, 3.2, 3.3, 3.4, 3.7, 3.8_

- [ ] 8. Update `frontend/lib/supabase/middleware.ts`

  - [ ] 8.1 Fix admin route guard for unauthenticated users
    - In the `isAdminRoute && !user` branch, change `redirectUrl.pathname = '/admin/login'` to `redirectUrl.pathname = '/login'`
    - Keep `redirectUrl.searchParams.set('next', pathname)` — this preserves the `?next=` chain
    - _Bug_Condition: isBugCondition(input) where unauthenticated admin route hits /admin/login instead of /login?next=..._
    - _Expected_Behavior: GET /admin/dashboard (no session) → 302 /login?next=/admin/dashboard_
    - _Requirements: 2.5_

  - [ ] 8.2 Add server-side role check for authenticated non-admin users on admin routes
    - After the `!user` early return, add a DB query: `const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()`
    - If `profile?.role !== 'admin'`, redirect to `/unauthorized`
    - Allow request to proceed only when `profile?.role === 'admin'`
    - Remove `/admin/login` from `publicOnlyRoutes` array (it should no longer be a meaningful destination)
    - _Bug_Condition: isBugCondition(input) where authenticated non-admin reaches /admin/* without server-side rejection_
    - _Expected_Behavior: GET /admin/dashboard as responder → 302 /unauthorized_
    - _Preservation: GET /admin/dashboard as admin → 200_
    - _Requirements: 2.5, 3.5_

- [ ] 9. Update server layouts to use `getUserAccess` and pass `role` prop

  - [ ] 9.1 Update `frontend/app/dashboard/layout.tsx`
    - Convert from `'use client'` to a server component (async function)
    - Move `supabase.auth.getUser()` call to the server (remove the `useEffect` + `createClient` client call)
    - Call `getUserAccess(supabase, user.id)` to obtain `access.role`
    - Pass `role={access.role}` to `TopNavbar` (once TopNavbar accepts the prop)
    - Keep `UserRealtimeProvider` usage (pass `userId` as before; the client sub-tree can remain)
    - Keep sidebar, mobile nav, and mobile drawer behaviour unchanged
    - _Requirements: 2.8_

  - [ ] 9.2 Update `frontend/app/hospital/layout.tsx`
    - Import `getUserAccess` from `@/lib/auth/get-user-access`
    - Replace the manual `supabase.from('profiles').select('*')` role check with `getUserAccess(supabase, user.id)`
    - Use `access.role` for the portal guard check (`access.role !== 'hospital_staff'` → redirect)
    - Pass `role={access.role}` to any nav component that accepts it
    - Retain organization membership and hospital profile checks (these are unchanged — still required for hospital access)
    - _Preservation: hospital_staff with approved org membership still reaches /hospital_
    - _Requirements: 2.8, 3.4_

  - [ ] 9.3 Update `frontend/app/responder/layout.tsx`
    - Import `getUserAccess` from `@/lib/auth/get-user-access`
    - Replace manual `supabase.from('profiles').select('role')` check with `getUserAccess(supabase, user.id)`
    - Use `access.role` for the portal guard check (`access.role !== 'responder' && access.role !== 'volunteer'` → redirect to pending/rejected/unauthorized)
    - Pass `role={access.role}` to any nav component that accepts it
    - Retain `UserRealtimeProvider` and `ResponderRealtimeProvider` usage
    - _Preservation: responder/volunteer still reaches /responder_
    - _Requirements: 2.8, 3.3_

- [ ] 10. Update `frontend/components/dashboard/TopNavbar.tsx`

  - [ ] 10.1 Accept `role` prop and pass to `NotificationDropdown`
    - Add `role?: NormalizedRole` to `TopNavbarProps` interface
    - Import `NormalizedRole` from `@/lib/auth/get-user-access`
    - Pass `userRole={role ?? 'user'}` to `NotificationDropdown` instead of the hardcoded `userRole="user"` string
    - Do NOT read `localStorage` or any client-side storage for the role
    - _Bug_Condition: isBugCondition(input) where TopNavbar renders admin nav items for a user-role account_
    - _Expected_Behavior: NotificationDropdown receives the DB-resolved role_
    - _Requirements: 2.8_

- [ ] 11. Write unit and property-based tests for `get-user-access.ts` and `storage.ts`

  - [ ] 11.1 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Role Redirect Bug (Wrong Portal After Login)
    - **IMPORTANT**: Re-run the SAME test from task 1 — do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms that `getRoleDashboardPath` in `get-user-access.ts` is the canonical resolver and the callback route no longer honours `?portal=`
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2_

  - [ ] 11.2 Unit tests for `getRoleDashboardPath`
    - Test all six DB enum values: `admin` → `/admin`, `hospital_staff` → `/hospital`, `hospital` (legacy) → `/hospital`, `responder` → `/responder`, `volunteer` → `/responder`, `user` → `/dashboard`
    - Test `null` input → `/dashboard`
    - Test unrecognized string (`'superadmin'`) → `/dashboard`
    - _Requirements: 2.10_

  - [ ] 11.3 Unit tests for `getUserAccess` with mocked Supabase client
    - Mock `supabase.from('profiles').select(...)` return for each role value; assert correct `dashboardPath` and `role` in returned `UserAccess`
    - Mock missing profile row → assert upsert called, `console.warn` fired in dev, returned role is `'user'`, `dashboardPath` is `/dashboard`
    - Mock `user` role + `portal_applications` with `status = 'pending'` → assert `dashboardPath === '/application-pending'`
    - Mock `user` role + `status = 'rejected'` → `/application-rejected`
    - Mock `user` role + `status = 'suspended'` → `/login?error=suspended`
    - Mock `user` role + no application → `/dashboard`
    - Assert dev log output does NOT contain JWT pattern `eyJ[A-Za-z0-9._-]{20,}`
    - _Requirements: 2.6, 2.7, 2.9, 2.10_

  - [ ] 11.4 Verify preservation tests still pass
    - **Property 2: Preservation** - Non-Elevated Role Redirect Behavior
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - Run preservation property tests from step 2 against the newly created `get-user-access.ts` and `storage.ts`
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions in user role redirect and `isNextAuthorized` logic)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.10_

- [ ] 12. Checkpoint — Ensure all tests pass
  - Run `npm run build` in `frontend/` to verify TypeScript compiles without errors
  - Run the full test suite (once a test runner is configured — `npm install --save-dev vitest @vitejs/plugin-react` if not present, then `npx vitest --run`)
  - Verify all property-based tests pass (Property 1: Bug Condition and Property 2: Preservation)
  - Verify all unit tests pass for `get-user-access.ts` and `storage.ts`
  - Manually smoke-test: email login as admin → lands on `/admin`; email login as user with `?portal=admin` → mismatch error shown, lands on `/dashboard`; Google OAuth as `hospital_staff` → lands on `/hospital`; unauthenticated GET `/admin/dashboard` → 302 to `/login?next=/admin/dashboard`; authenticated responder GET `/admin/dashboard` → 302 to `/unauthorized`
  - Ensure all tests pass; ask the user if questions arise

## Task Dependency Graph

```json
{
  "waves": [
    { "wave": 1, "tasks": ["1", "2"] },
    { "wave": 2, "tasks": ["3.1", "3.2", "3.3", "8"] },
    { "wave": 3, "tasks": ["4.1", "4.2", "5"] },
    { "wave": 4, "tasks": ["6.1", "6.2", "6.3", "7.1", "9.1", "9.2", "9.3", "10.1"] },
    { "wave": 5, "tasks": ["11.1", "11.2", "11.3", "11.4"] },
    { "wave": 6, "tasks": ["12"] }
  ]
}
```

## Notes

- `fast-check` must be installed as a devDependency (`npm install --save-dev fast-check`) before tasks 1, 2, and 11 can run.
- A test runner (`vitest`) is also needed; install with `npm install --save-dev vitest @vitejs/plugin-react` if not already present.
- `get-user-role.ts` may remain for backward compatibility but should delegate its `getRoleDashboardPath` to the new module — or callers can be migrated to import from `get-user-access.ts` directly.
- The `dashboard/layout.tsx` is currently a client component; converting it to a server component for task 9.1 requires moving the Supabase session fetch to the server. If full conversion is blocked by client-only dependencies, a minimal approach is to keep the layout client-side and add a separate server wrapper that fetches `access.role` and passes it down as a prop.
- The `protect_profile_auth_fields` DB trigger (requirement 3.9) is unchanged — no migration is needed.
