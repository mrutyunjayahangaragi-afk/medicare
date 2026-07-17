-- ============================================================
-- Migration: fix_emergency_requests_responder_rls
-- Created: 2026-07-18
-- Purpose:
--   The responder dashboard queries emergency_requests directly via the
--   Supabase client. The original RLS select policy (from 20260714210600)
--   only checks for role in ('volunteer', 'hospital') — it does NOT
--   include the 'responder' or 'hospital_staff' roles that were added in
--   later migrations. This means approved responders with role='responder'
--   cannot see available pending requests on their dashboard.
--
--   This migration replaces the responder select policy with one that
--   covers all responder-equivalent roles.
-- ============================================================

-- Drop the old policy (may have been created under either name)
drop policy if exists "Responders can view available and assigned requests"
  on public.emergency_requests;

-- New policy: covers all responder-equivalent roles
-- A user can see:
--   (a) any pending unassigned request (available to accept), OR
--   (b) any request assigned to themselves
-- Profile role is validated via a sub-select to prevent spoofing.
create policy "Responders can view available and assigned requests"
  on public.emergency_requests
  for select
  to authenticated
  using (
    -- Any pending, unassigned request is visible to all verified responders
    (
      status = 'pending'
      and assigned_responder_id is null
      and exists (
        select 1 from public.profiles
        where id = auth.uid()
          and role in ('volunteer', 'hospital', 'hospital_staff', 'responder')
      )
    )
    or
    -- Assigned responder can always see their own request
    assigned_responder_id = auth.uid()
  );


-- ── Also ensure the user's own select policy is still present ─────────────
do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'emergency_requests'
      and policyname = 'Users can select own emergency requests'
  ) then
    create policy "Users can select own emergency requests"
      on public.emergency_requests
      for select
      to authenticated
      using (auth.uid() = user_id);
  end if;
end $$;
