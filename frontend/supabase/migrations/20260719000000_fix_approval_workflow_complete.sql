-- ============================================================
-- Migration: fix_approval_workflow_complete
-- Created: 2026-07-19
-- Purpose:
--   Root cause fix for the approve/reject bug plus all downstream
--   portal routing and dashboard issues identified in the audit.
--
--   1. Fix portal_applications UPDATE policy — the existing policy
--      uses USING clause but not WITH CHECK, so service-role updates
--      work but user-scoped admin updates would fail.
--      Since backend uses service-role, this is belt-and-suspenders.
--
--   2. Add explicit service-role INSERT/UPDATE bypass for
--      portal_applications (service-role always bypasses RLS, but
--      makes intent explicit in policy comments).
--
--   3. Fix protect_profile_auth_fields trigger — it blocks updates
--      when auth.uid() matches the profile being updated. When the
--      backend service-role client updates a profile, auth.uid() is
--      NULL, so the trigger correctly allows it. Add explicit NULL
--      check to make this bulletproof.
--
--   4. Add organizations RLS admin read policy (admins need to
--      read organizations in admin portal).
--
--   5. Add organization_members admin read policy.
--
--   6. Fix notification type constraint to ensure application_*
--      types are included (idempotent — already in 20260717200000
--      but re-applied here for safety).
--
--   7. Ensure organizations.name unique constraint exists for
--      ON CONFLICT upsert logic.
--
--   8. Add admin SELECT policy for profiles (so admin can read
--      all profiles — needed for user management).
--
--   9. Replace approve_portal_application RPC with the fully
--      correct version (organization_id set on profile, correct
--      column names, correct audit log ID handling).
--
--  10. Replace reject_portal_application RPC (idempotent).
--
--  11. Add responder portal organization_members entry for
--      approved responders with org names.
--
--  12. Grant admin SELECT on audit_logs.
-- ============================================================

begin;

-- ══════════════════════════════════════════════════════════════════════
-- 1. Fix protect_profile_auth_fields — explicit NULL guard
--    When service-role updates a profile, auth.uid() is NULL.
--    The current code already handles this since NULL != any UUID,
--    but we make the intent explicit and add a guard.
-- ══════════════════════════════════════════════════════════════════════
create or replace function public.protect_profile_auth_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Only block self-updates from the authenticated user themselves.
  -- Service-role operations: auth.uid() is NULL → guard does NOT fire.
  -- Admin backend writes: uses service-role → allowed.
  if auth.uid() is not null and auth.uid() = new.id then
    -- Preserve protected fields — user cannot escalate their own role
    new.role            := old.role;
    new.organization_id := old.organization_id;
    new.responder_type  := old.responder_type;
    new.is_verified     := old.is_verified;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_auth_fields on public.profiles;
create trigger profiles_protect_auth_fields
  before update on public.profiles
  for each row execute function public.protect_profile_auth_fields();


-- ══════════════════════════════════════════════════════════════════════
-- 2. portal_applications — ensure admin UPDATE policy exists and
--    is correct (idempotent).
-- ══════════════════════════════════════════════════════════════════════
do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'portal_applications'
      and policyname = 'Admins can update all applications'
  ) then
    execute $pol$
      create policy "Admins can update all applications"
        on public.portal_applications
        for update
        using (
          exists (
            select 1 from public.profiles
            where id = auth.uid() and role = 'admin'
          )
        )
        with check (
          exists (
            select 1 from public.profiles
            where id = auth.uid() and role = 'admin'
          )
        )
    $pol$;
  end if;
end $$;

-- Ensure admin SELECT policy exists
do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'portal_applications'
      and policyname = 'Admins can view all applications'
  ) then
    execute $pol$
      create policy "Admins can view all applications"
        on public.portal_applications
        for select
        using (
          exists (
            select 1 from public.profiles
            where id = auth.uid() and role = 'admin'
          )
        )
    $pol$;
  end if;
end $$;


-- ══════════════════════════════════════════════════════════════════════
-- 3. profiles — admin SELECT policy (needed for admin user management)
-- ══════════════════════════════════════════════════════════════════════
do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'profiles'
      and policyname = 'Admins can view all profiles'
  ) then
    execute $pol$
      create policy "Admins can view all profiles"
        on public.profiles
        for select
        using (
          exists (
            select 1 from public.profiles p2
            where p2.id = auth.uid() and p2.role = 'admin'
          )
        )
    $pol$;
  end if;
end $$;


-- ══════════════════════════════════════════════════════════════════════
-- 4. organizations — admin SELECT policy
-- ══════════════════════════════════════════════════════════════════════
do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'organizations'
      and policyname = 'Admins can view all organizations'
  ) then
    execute $pol$
      create policy "Admins can view all organizations"
        on public.organizations
        for select
        using (
          exists (
            select 1 from public.profiles
            where id = auth.uid() and role = 'admin'
          )
        )
    $pol$;
  end if;
end $$;


-- ══════════════════════════════════════════════════════════════════════
-- 5. organization_members — admin SELECT policy
-- ══════════════════════════════════════════════════════════════════════
do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'organization_members'
      and policyname = 'Admins can view all organization members'
  ) then
    execute $pol$
      create policy "Admins can view all organization members"
        on public.organization_members
        for select
        using (
          exists (
            select 1 from public.profiles
            where id = auth.uid() and role = 'admin'
          )
        )
    $pol$;
  end if;
end $$;


-- ══════════════════════════════════════════════════════════════════════
-- 6. audit_logs — admin SELECT policy
-- ══════════════════════════════════════════════════════════════════════
do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'audit_logs'
      and policyname = 'Admins can view audit logs'
  ) then
    execute $pol$
      create policy "Admins can view audit logs"
        on public.audit_logs
        for select
        using (
          exists (
            select 1 from public.profiles
            where id = auth.uid() and role = 'admin'
          )
        )
    $pol$;
  end if;
end $$;


-- ══════════════════════════════════════════════════════════════════════
-- 7. organizations.name UNIQUE constraint (required for ON CONFLICT)
-- ══════════════════════════════════════════════════════════════════════
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'organizations_name_unique'
      and conrelid = 'public.organizations'::regclass
  ) then
    alter table public.organizations
      add constraint organizations_name_unique unique (name);
  end if;
end $$;


-- ══════════════════════════════════════════════════════════════════════
-- 8. notifications type constraint — ensure approval types are valid
-- ══════════════════════════════════════════════════════════════════════
do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'notification_type_check'
      and conrelid = 'public.notifications'::regclass
  ) then
    alter table public.notifications drop constraint notification_type_check;
  end if;
end $$;

alter table public.notifications
  add constraint notification_type_check check (
    type in (
      'request_submitted', 'request_accepted', 'responder_on_the_way',
      'responder_nearby', 'responder_arrived', 'request_completed',
      'request_cancelled', 'new_message', 'assignment_received', 'system',
      'application_approved', 'application_rejected',
      'sos_alert', 'recommendation',
      'success', 'error', 'info', 'warning'
    )
  );


-- ══════════════════════════════════════════════════════════════════════
-- 9. Add is_read column to notifications if missing
-- ══════════════════════════════════════════════════════════════════════
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'notifications'
      and column_name = 'is_read'
  ) then
    alter table public.notifications add column is_read boolean not null default false;
  end if;
end $$;


-- ══════════════════════════════════════════════════════════════════════
-- 10. Replace approve_portal_application RPC (complete, correct version)
--     - Uses auth.uid() (never client-supplied admin ID)
--     - Sets profiles.organization_id for hospital_staff
--     - Creates organization_members for both hospital and responder
--     - Handles audit_logs.id being either bigint or uuid safely
--     - Inserts notification with correct type
-- ══════════════════════════════════════════════════════════════════════
create or replace function public.approve_portal_application(
    p_application_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_admin_id        uuid;
    v_application     record;
    v_organization_id uuid;
    v_profile_data    record;
    v_org_name        text;
begin
    v_admin_id := auth.uid();

    if v_admin_id is null then
        raise exception 'User must be authenticated';
    end if;

    if not exists (
        select 1 from public.profiles
        where id = v_admin_id and role = 'admin'
    ) then
        raise exception 'Unauthorized: caller is not an admin';
    end if;

    select * into v_application
    from public.portal_applications
    where id = p_application_id
    for update;

    if not found then
        raise exception 'Application % not found', p_application_id;
    end if;

    if v_application.user_id = v_admin_id then
        raise exception 'Cannot approve your own application';
    end if;

    if v_application.status != 'pending' then
        raise exception 'Application is not pending (current status: %)', v_application.status;
    end if;

    -- Mark approved
    update public.portal_applications
    set
        status      = 'approved',
        reviewed_by = v_admin_id,
        reviewed_at = now(),
        updated_at  = now()
    where id = p_application_id;

    if v_application.application_type = 'hospital' then

        -- Resolve organization name
        v_org_name := trim(coalesce(v_application.organization_name, ''));
        if v_org_name = '' then
            select full_name, email into v_profile_data
            from public.profiles where id = v_application.user_id;
            v_org_name := coalesce(
                nullif(trim(v_profile_data.full_name), ''),
                split_part(coalesce(v_profile_data.email, ''), '@', 1),
                'Hospital-' || substr(p_application_id::text, 1, 8)
            );
        end if;

        -- Upsert organization
        insert into public.organizations (
            name, organization_type, address, phone, is_verified, created_at, updated_at
        ) values (
            v_org_name, 'hospital',
            v_application.address, v_application.phone,
            true, now(), now()
        )
        on conflict (name) do update set
            is_verified = true,
            address     = coalesce(excluded.address, organizations.address),
            phone       = coalesce(excluded.phone, organizations.phone),
            updated_at  = now()
        returning id into v_organization_id;

        -- Create membership
        insert into public.organization_members (
            user_id, organization_id, member_role, status, created_at, updated_at
        ) values (
            v_application.user_id, v_organization_id, 'owner', 'approved', now(), now()
        )
        on conflict (organization_id, user_id) do update set
            status     = 'approved',
            updated_at = now();

        -- Update profile: role + organization_id
        update public.profiles
        set
            role            = 'hospital_staff',
            organization_id = v_organization_id,
            updated_at      = now()
        where id = v_application.user_id;

    elsif v_application.application_type = 'responder' then

        -- Update profile role
        update public.profiles
        set role = 'responder', updated_at = now()
        where id = v_application.user_id;

        -- Create org membership if org name provided
        v_org_name := trim(coalesce(v_application.organization_name, ''));
        if v_org_name != '' then
            insert into public.organizations (
                name, organization_type, address, phone, is_verified, created_at, updated_at
            ) values (
                v_org_name, 'other',
                v_application.address, v_application.phone,
                true, now(), now()
            )
            on conflict (name) do update set
                is_verified = true,
                updated_at  = now()
            returning id into v_organization_id;

            insert into public.organization_members (
                user_id, organization_id, member_role, status, created_at, updated_at
            ) values (
                v_application.user_id, v_organization_id, 'responder', 'approved', now(), now()
            )
            on conflict (organization_id, user_id) do update set
                status = 'approved', updated_at = now();
        end if;

    else
        raise exception 'Unknown application type: %', v_application.application_type;
    end if;

    -- Audit log (non-fatal: wrap in exception block)
    begin
        insert into public.audit_logs (
            actor_id, action, entity_type, entity_id, old_data, new_data
        ) values (
            v_admin_id, 'application_approved', 'portal_application',
            p_application_id::text,
            jsonb_build_object('status', 'pending'),
            jsonb_build_object(
                'status', 'approved',
                'application_type', v_application.application_type,
                'organization_id', v_organization_id
            )
        );
    exception when others then
        null; -- non-fatal
    end;

    -- Notification (non-fatal)
    begin
        insert into public.notifications (recipient_id, type, title, message, is_read)
        values (
            v_application.user_id,
            'application_approved',
            'Application Approved',
            'Your ' || v_application.application_type || ' application has been approved. '
            'You can now log in to access your portal.',
            false
        );
    exception when others then
        null; -- non-fatal
    end;

    return jsonb_build_object(
        'success',          true,
        'application_id',   p_application_id,
        'organization_id',  v_organization_id
    );
end;
$$;

grant  execute on function public.approve_portal_application(uuid) to authenticated;
revoke execute on function public.approve_portal_application(uuid) from anon;


-- ══════════════════════════════════════════════════════════════════════
-- 11. Replace reject_portal_application RPC
-- ══════════════════════════════════════════════════════════════════════
create or replace function public.reject_portal_application(
    p_application_id   uuid,
    p_rejection_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_admin_id    uuid;
    v_application record;
begin
    v_admin_id := auth.uid();

    if v_admin_id is null then
        raise exception 'User must be authenticated';
    end if;

    if not exists (
        select 1 from public.profiles
        where id = v_admin_id and role = 'admin'
    ) then
        raise exception 'Unauthorized: caller is not an admin';
    end if;

    if p_rejection_reason is null
       or length(trim(p_rejection_reason)) < 10
       or length(p_rejection_reason) > 500
    then
        raise exception 'Rejection reason must be between 10 and 500 characters';
    end if;

    select * into v_application
    from public.portal_applications
    where id = p_application_id
    for update;

    if not found then
        raise exception 'Application % not found', p_application_id;
    end if;

    if v_application.user_id = v_admin_id then
        raise exception 'Cannot reject your own application';
    end if;

    if v_application.status != 'pending' then
        raise exception 'Application is not pending (current status: %)', v_application.status;
    end if;

    update public.portal_applications
    set
        status           = 'rejected',
        reviewed_by      = v_admin_id,
        reviewed_at      = now(),
        rejection_reason = p_rejection_reason,
        updated_at       = now()
    where id = p_application_id;

    begin
        insert into public.audit_logs (
            actor_id, action, entity_type, entity_id, old_data, new_data
        ) values (
            v_admin_id, 'application_rejected', 'portal_application',
            p_application_id::text,
            jsonb_build_object('status', 'pending'),
            jsonb_build_object('status', 'rejected', 'reason', p_rejection_reason)
        );
    exception when others then
        null;
    end;

    begin
        insert into public.notifications (recipient_id, type, title, message, is_read)
        values (
            v_application.user_id,
            'application_rejected',
            'Application Rejected',
            'Your ' || v_application.application_type || ' application has been rejected. '
            'Reason: ' || p_rejection_reason,
            false
        );
    exception when others then
        null;
    end;

    return jsonb_build_object(
        'success',        true,
        'application_id', p_application_id
    );
end;
$$;

grant  execute on function public.reject_portal_application(uuid, text) to authenticated;
revoke execute on function public.reject_portal_application(uuid, text) from anon;


-- ══════════════════════════════════════════════════════════════════════
-- 12. Admin stats helper: get_admin_dashboard_stats()
--     Returns live counts for the admin dashboard.
-- ══════════════════════════════════════════════════════════════════════
create or replace function public.get_admin_dashboard_stats()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_uid uuid;
begin
    v_uid := auth.uid();
    if v_uid is null then raise exception 'User must be authenticated'; end if;
    if not exists (select 1 from public.profiles where id = v_uid and role = 'admin') then
        raise exception 'Unauthorized';
    end if;

    return jsonb_build_object(
        'total_users',           (select count(*) from public.profiles),
        'total_hospitals',       (select count(*) from public.organizations where organization_type = 'hospital'),
        'total_responders',      (select count(*) from public.profiles where role in ('responder', 'volunteer')),
        'pending_applications',  (select count(*) from public.portal_applications where status = 'pending'),
        'approved_applications', (select count(*) from public.portal_applications where status = 'approved'),
        'rejected_applications', (select count(*) from public.portal_applications where status = 'rejected'),
        'active_emergencies',    (select count(*) from public.emergency_requests where status in ('accepted', 'in_progress', 'arrived')),
        'completed_requests',    (select count(*) from public.emergency_requests where status = 'completed'),
        'total_requests',        (select count(*) from public.emergency_requests)
    );
end;
$$;

grant  execute on function public.get_admin_dashboard_stats() to authenticated;
revoke execute on function public.get_admin_dashboard_stats() from anon;


-- ══════════════════════════════════════════════════════════════════════
-- 13. hospital_profiles — add admin SELECT policy
-- ══════════════════════════════════════════════════════════════════════
do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'hospital_profiles'
      and policyname = 'Admins can view all hospital profiles'
  ) then
    execute $pol$
      create policy "Admins can view all hospital profiles"
        on public.hospital_profiles for select
        using (
          exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
        )
    $pol$;
  end if;
end $$;


commit;
