-- ============================================================
-- Migration: fix_profiles_rls_infinite_recursion
-- Created: 2026-07-21
-- Purpose:
--   Fix PostgreSQL error 42P17 "infinite recursion detected in
--   policy for relation profiles".
--
-- Root cause:
--   The "Admins can view all profiles" policy (added in migration
--   20260719000000) reads from public.profiles inside its own
--   USING clause:
--
--     exists (
--       select 1 from public.profiles p2   ← recursive!
--       where p2.id = auth.uid() and p2.role = 'admin'
--     )
--
--   When any query touches public.profiles, PostgreSQL evaluates
--   ALL select policies for that table. Each evaluation re-reads
--   profiles → triggers the policies again → infinite loop.
--
--   The same recursive sub-select pattern appears in policies on
--   portal_applications, organizations, organization_members,
--   audit_logs, and hospital_profiles, which causes the same
--   error whenever those tables are queried by users whose
--   profiles are checked through the recursive policy chain.
--
-- Fix strategy:
--   1. Create a SECURITY DEFINER helper function get_my_role()
--      that reads the caller's role from public.profiles while
--      BYPASSING RLS (security definer + explicit set search_path).
--      This breaks the recursion.
--
--   2. Drop and recreate EVERY policy that uses:
--        exists (select 1 from public.profiles where ... role = 'admin')
--      replacing that sub-select with:
--        public.get_my_role() = 'admin'
--
--   3. Ensure the profiles own-row select policy uses
--      auth.uid() = id (no sub-select) — already correct.
--
-- Safe to re-run: all DROP POLICY / CREATE POLICY are idempotent.
-- ============================================================

begin;

-- ══════════════════════════════════════════════════════════════════════
-- 1. Security-definer helper: get_my_role()
--    Reads the authenticated user's role from public.profiles.
--    Because it is SECURITY DEFINER it runs with the privileges of
--    the function OWNER (postgres / service role), which bypasses RLS
--    on profiles. This is safe because:
--      • It only returns the role for auth.uid() — never another user.
--      • It is READ-ONLY (SELECT).
--      • It returns NULL (not 'admin') when called by unauthenticated
--        requests, so no privilege escalation is possible.
-- ══════════════════════════════════════════════════════════════════════
create or replace function public.get_my_role()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select role::text
  from   public.profiles
  where  id = auth.uid()
  limit  1;
$$;

-- Grant to authenticated users (they call this implicitly via policies)
grant execute on function public.get_my_role() to authenticated;

-- ══════════════════════════════════════════════════════════════════════
-- 2. profiles table — fix admin SELECT policy
--    Drop the recursive policy and replace with the helper.
-- ══════════════════════════════════════════════════════════════════════
drop policy if exists "Admins can view all profiles" on public.profiles;

create policy "Admins can view all profiles"
  on public.profiles
  for select
  to authenticated
  using ( public.get_my_role() = 'admin' );

-- Ensure the standard own-row policy exists (non-recursive — no change needed)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'profiles'
      and policyname = 'Users can view own profile'
  ) then
    execute $pol$
      create policy "Users can view own profile"
        on public.profiles
        for select
        to authenticated
        using ( auth.uid() = id )
    $pol$;
  end if;
end $$;

-- ══════════════════════════════════════════════════════════════════════
-- 3. portal_applications — replace recursive admin policies
-- ══════════════════════════════════════════════════════════════════════
drop policy if exists "Admins can view all applications"   on public.portal_applications;
drop policy if exists "Admins can update all applications" on public.portal_applications;

create policy "Admins can view all applications"
  on public.portal_applications
  for select
  to authenticated
  using ( public.get_my_role() = 'admin' );

create policy "Admins can update all applications"
  on public.portal_applications
  for update
  to authenticated
  using      ( public.get_my_role() = 'admin' )
  with check ( public.get_my_role() = 'admin' );

-- ══════════════════════════════════════════════════════════════════════
-- 4. organizations — replace recursive admin policy
-- ══════════════════════════════════════════════════════════════════════
drop policy if exists "Admins can view all organizations" on public.organizations;

create policy "Admins can view all organizations"
  on public.organizations
  for select
  to authenticated
  using ( public.get_my_role() = 'admin' );

-- ══════════════════════════════════════════════════════════════════════
-- 5. organization_members — replace recursive admin policy
-- ══════════════════════════════════════════════════════════════════════
drop policy if exists "Admins can view all organization members" on public.organization_members;

create policy "Admins can view all organization members"
  on public.organization_members
  for select
  to authenticated
  using ( public.get_my_role() = 'admin' );

-- ══════════════════════════════════════════════════════════════════════
-- 6. audit_logs — replace recursive admin policy
-- ══════════════════════════════════════════════════════════════════════
drop policy if exists "Admins can view audit logs" on public.audit_logs;

create policy "Admins can view audit logs"
  on public.audit_logs
  for select
  to authenticated
  using ( public.get_my_role() = 'admin' );

-- ══════════════════════════════════════════════════════════════════════
-- 7. hospital_profiles — replace recursive admin policy
-- ══════════════════════════════════════════════════════════════════════
drop policy if exists "Admins can view all hospital profiles" on public.hospital_profiles;

create policy "Admins can view all hospital profiles"
  on public.hospital_profiles
  for select
  to authenticated
  using ( public.get_my_role() = 'admin' );

-- ══════════════════════════════════════════════════════════════════════
-- 8. emergency_requests — fix the responder select policy
--    The existing policy does:
--      exists (select 1 from public.profiles where id = auth.uid()
--              and role in (...))
--    This is not self-recursive (it reads profiles from emergency_requests
--    policy, not profiles policy), BUT it can still be slow and will
--    break if profiles policies are misconfigured. Replace with get_my_role().
-- ══════════════════════════════════════════════════════════════════════
drop policy if exists "Responders can view available and assigned requests"
  on public.emergency_requests;

create policy "Responders can view available and assigned requests"
  on public.emergency_requests
  for select
  to authenticated
  using (
    -- Pending unassigned requests visible to all responder-role users
    (
      status = 'pending'
      and assigned_responder_id is null
      and public.get_my_role() in ('volunteer', 'hospital', 'hospital_staff', 'responder')
    )
    or
    -- Assigned responder can always see their own assigned request
    assigned_responder_id = auth.uid()
  );

-- ══════════════════════════════════════════════════════════════════════
-- 9. Verify get_my_role is accessible
-- ══════════════════════════════════════════════════════════════════════
-- Quick smoke-test: calling get_my_role() as service-role should
-- return NULL (no auth.uid() in service-role context).
-- This runs at migration time so any syntax error is caught early.
do $$
declare
  v_result text;
begin
  -- service-role context: auth.uid() is null → get_my_role() returns null
  select public.get_my_role() into v_result;
  -- No assertion needed — just ensuring the function is callable
  raise notice 'get_my_role() smoke test passed (result=%)' , coalesce(v_result, 'null');
end $$;

commit;
