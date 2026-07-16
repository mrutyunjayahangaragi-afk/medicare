-- ============================================================
-- Migration: fix_audit_rpc_grants
-- Created: 2026-07-16
-- Purpose: Step 22 Security Review — Fix three RPC/RLS vulnerabilities
--
-- Issues fixed:
--   P1-SEC-003: write_audit_log was re-granted to authenticated users by
--               migration 20260715220000. This migration revokes it.
--   P1-SEC-004: Admin RPC functions (approve_portal_application etc.) accepted
--               p_admin_id as a caller-supplied parameter and verified role
--               against that ID — not auth.uid(). Fixed to use auth.uid().
--   P2-RLS-020: "System can insert audit logs" WITH CHECK (true) allowed any
--               authenticated user to INSERT directly via PostgREST.
--               Replaced with a restrictive policy that blocks direct inserts.
-- ============================================================

begin;

-- ══════════════════════════════════════════════════════════════════════
-- 1.  REVOKE write_audit_log FROM authenticated
--     Migration 20260715220000 re-granted this; we remove it.
-- ══════════════════════════════════════════════════════════════════════
revoke execute on function public.write_audit_log from authenticated;
revoke execute on function public.write_audit_log from anon;
-- Service-role always has implicit access; no need to grant explicitly.


-- ══════════════════════════════════════════════════════════════════════
-- 2.  FIX audit_logs insert policy
--     Remove the overly-permissive WITH CHECK (true) insert policy and
--     replace with a policy that blocks all direct PostgREST inserts from
--     authenticated users. The backend uses service_role which bypasses RLS.
-- ══════════════════════════════════════════════════════════════════════
drop policy if exists "System can insert audit logs" on public.audit_logs;

-- No insert policy for authenticated or anon — service_role only.
-- This means direct PostgREST calls from the browser to insert audit_logs
-- will be blocked by RLS (no matching policy = deny).


-- ══════════════════════════════════════════════════════════════════════
-- 3.  FIX admin RPC functions — use auth.uid() not client-supplied p_admin_id
--
--     The original functions accepted p_admin_id UUID as a parameter and
--     verified admin role against it. An attacker who discovers any admin UUID
--     could pass it to impersonate that admin's authority.
--
--     Fixed: Remove p_admin_id parameter. Use auth.uid() internally.
--     The caller must be the authenticated admin — the function validates this.
-- ══════════════════════════════════════════════════════════════════════

-- 3a. approve_portal_application — no p_admin_id parameter
create or replace function public.approve_portal_application(
    p_application_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_admin_id       uuid;
    v_application    record;
    v_organization_id uuid;
    v_log_id         uuid;
begin
    -- Use authenticated caller's ID — never trust a client-supplied value
    v_admin_id := auth.uid();

    if v_admin_id is null then
        raise exception 'User must be authenticated';
    end if;

    -- Verify admin role from the database
    if not exists (
        select 1 from public.profiles
        where id = v_admin_id and role = 'admin'
    ) then
        raise exception 'Unauthorized: User is not an admin';
    end if;

    -- Lock and fetch application
    select * into v_application
    from public.portal_applications
    where id = p_application_id
    for update;

    if not found then
        raise exception 'Application not found';
    end if;

    -- Prevent self-approval
    if v_application.user_id = v_admin_id then
        raise exception 'Cannot approve your own application';
    end if;

    if v_application.status != 'pending' then
        raise exception 'Application is not pending';
    end if;

    -- Update application status
    update public.portal_applications
    set
        status      = 'approved',
        reviewed_by = v_admin_id,
        reviewed_at = now()
    where id = p_application_id;

    -- Update user role based on application type
    if v_application.application_type = 'hospital' then
        update public.profiles set role = 'hospital_staff' where id = v_application.user_id;

        insert into public.organizations (
            name, organization_type, address, phone, is_verified, created_at, updated_at
        ) values (
            v_application.organization_name, 'hospital',
            v_application.address, v_application.phone, true, now(), now()
        )
        on conflict (name) do update set
            address    = excluded.address,
            phone      = excluded.phone,
            is_verified = true,
            updated_at = now()
        returning id into v_organization_id;

        insert into public.organization_members (
            user_id, organization_id, member_role, status, created_at, updated_at
        ) values (
            v_application.user_id, v_organization_id, 'owner', 'approved', now(), now()
        ) on conflict do nothing;

    elsif v_application.application_type = 'responder' then
        update public.profiles set role = 'responder' where id = v_application.user_id;
    end if;

    -- Audit log
    insert into public.audit_logs (actor_id, action, entity_type, entity_id, old_data, new_data)
    values (
        v_admin_id, 'application_approved', 'portal_application', p_application_id::text,
        jsonb_build_object('status', v_application.status),
        jsonb_build_object('status', 'approved', 'application_type', v_application.application_type)
    ) returning id::uuid into v_log_id;

    return jsonb_build_object(
        'success', true,
        'application_id', p_application_id,
        'audit_log_id', v_log_id
    );
end;
$$;

-- Only authenticated users may call this; role check is inside the function
grant execute on function public.approve_portal_application(uuid) to authenticated;
revoke execute on function public.approve_portal_application(uuid) from anon;


-- 3b. reject_portal_application — no p_admin_id parameter
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
    v_log_id      uuid;
begin
    v_admin_id := auth.uid();

    if v_admin_id is null then
        raise exception 'User must be authenticated';
    end if;

    if not exists (
        select 1 from public.profiles
        where id = v_admin_id and role = 'admin'
    ) then
        raise exception 'Unauthorized: User is not an admin';
    end if;

    -- Validate rejection reason
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
        raise exception 'Application not found';
    end if;

    -- Prevent self-rejection
    if v_application.user_id = v_admin_id then
        raise exception 'Cannot reject your own application';
    end if;

    if v_application.status != 'pending' then
        raise exception 'Application is not pending';
    end if;

    update public.portal_applications
    set
        status           = 'rejected',
        reviewed_by      = v_admin_id,
        reviewed_at      = now(),
        rejection_reason = p_rejection_reason
    where id = p_application_id;

    insert into public.audit_logs (actor_id, action, entity_type, entity_id, old_data, new_data)
    values (
        v_admin_id, 'application_rejected', 'portal_application', p_application_id::text,
        jsonb_build_object('status', v_application.status),
        jsonb_build_object('status', 'rejected', 'reason', p_rejection_reason)
    ) returning id::uuid into v_log_id;

    return jsonb_build_object(
        'success', true,
        'application_id', p_application_id,
        'audit_log_id', v_log_id
    );
end;
$$;

grant execute on function public.reject_portal_application(uuid, text) to authenticated;
revoke execute on function public.reject_portal_application(uuid, text) from anon;


-- 3c. suspend_user — no p_admin_id parameter
create or replace function public.suspend_user(
    p_user_id uuid,
    p_reason  text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_admin_id    uuid;
    v_profile     record;
    v_admin_count int;
    v_log_id      uuid;
begin
    v_admin_id := auth.uid();

    if v_admin_id is null then
        raise exception 'User must be authenticated';
    end if;

    if not exists (
        select 1 from public.profiles
        where id = v_admin_id and role = 'admin'
    ) then
        raise exception 'Unauthorized: User is not an admin';
    end if;

    -- Prevent self-suspension
    if p_user_id = v_admin_id then
        raise exception 'Cannot suspend yourself';
    end if;

    -- Ensure at least one other active admin remains
    select count(*) into v_admin_count
    from public.profiles
    where role = 'admin' and account_status = 'active' and id != p_user_id;

    if v_admin_count = 0 then
        raise exception 'Cannot suspend the last active admin';
    end if;

    select * into v_profile
    from public.profiles
    where id = p_user_id
    for update;

    if not found then
        raise exception 'User not found';
    end if;

    if v_profile.account_status = 'suspended' then
        raise exception 'User is already suspended';
    end if;

    update public.profiles
    set account_status = 'suspended'
    where id = p_user_id;

    insert into public.audit_logs (actor_id, action, entity_type, entity_id, old_data, new_data)
    values (
        v_admin_id, 'user_suspended', 'profile', p_user_id::text,
        jsonb_build_object('account_status', v_profile.account_status),
        jsonb_build_object('account_status', 'suspended', 'reason', p_reason)
    ) returning id::uuid into v_log_id;

    return jsonb_build_object(
        'success', true,
        'user_id', p_user_id,
        'audit_log_id', v_log_id
    );
end;
$$;

grant execute on function public.suspend_user(uuid, text) to authenticated;
revoke execute on function public.suspend_user(uuid, text) from anon;


-- 3d. reactivate_user — no p_admin_id parameter
create or replace function public.reactivate_user(
    p_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_admin_id uuid;
    v_profile  record;
    v_log_id   uuid;
begin
    v_admin_id := auth.uid();

    if v_admin_id is null then
        raise exception 'User must be authenticated';
    end if;

    if not exists (
        select 1 from public.profiles
        where id = v_admin_id and role = 'admin'
    ) then
        raise exception 'Unauthorized: User is not an admin';
    end if;

    select * into v_profile
    from public.profiles
    where id = p_user_id
    for update;

    if not found then
        raise exception 'User not found';
    end if;

    if v_profile.account_status = 'active' then
        raise exception 'User is already active';
    end if;

    update public.profiles
    set account_status = 'active'
    where id = p_user_id;

    insert into public.audit_logs (actor_id, action, entity_type, entity_id, old_data, new_data)
    values (
        v_admin_id, 'user_reactivated', 'profile', p_user_id::text,
        jsonb_build_object('account_status', v_profile.account_status),
        jsonb_build_object('account_status', 'active')
    ) returning id::uuid into v_log_id;

    return jsonb_build_object(
        'success', true,
        'user_id', p_user_id,
        'audit_log_id', v_log_id
    );
end;
$$;

grant execute on function public.reactivate_user(uuid) to authenticated;
revoke execute on function public.reactivate_user(uuid) from anon;


-- 3e. change_user_role — no p_admin_id parameter
create or replace function public.change_user_role(
    p_user_id  uuid,
    p_new_role text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_admin_id    uuid;
    v_profile     record;
    v_admin_count int;
    v_log_id      uuid;
begin
    v_admin_id := auth.uid();

    if v_admin_id is null then
        raise exception 'User must be authenticated';
    end if;

    if not exists (
        select 1 from public.profiles
        where id = v_admin_id and role = 'admin'
    ) then
        raise exception 'Unauthorized: User is not an admin';
    end if;

    -- Validate new role against allowlist
    if p_new_role not in ('user', 'responder', 'volunteer', 'hospital_staff', 'admin') then
        raise exception 'Invalid role';
    end if;

    -- Prevent self-promotion to admin (already admin, so this is a no-op guard)
    if p_user_id = v_admin_id and p_new_role = 'admin' then
        raise exception 'Cannot promote yourself to admin';
    end if;

    -- Prevent demoting the last active admin
    if p_new_role != 'admin' then
        select count(*) into v_admin_count
        from public.profiles
        where role = 'admin' and account_status = 'active' and id != p_user_id;

        if v_admin_count = 0 then
            raise exception 'Cannot remove the last active admin';
        end if;
    end if;

    select * into v_profile
    from public.profiles
    where id = p_user_id
    for update;

    if not found then
        raise exception 'User not found';
    end if;

    if v_profile.role::text = p_new_role then
        raise exception 'User already has this role';
    end if;

    update public.profiles
    set role = p_new_role
    where id = p_user_id;

    insert into public.audit_logs (actor_id, action, entity_type, entity_id, old_data, new_data)
    values (
        v_admin_id, 'role_changed', 'profile', p_user_id::text,
        jsonb_build_object('role', v_profile.role),
        jsonb_build_object('role', p_new_role)
    ) returning id::uuid into v_log_id;

    return jsonb_build_object(
        'success', true,
        'user_id', p_user_id,
        'new_role', p_new_role,
        'audit_log_id', v_log_id
    );
end;
$$;

grant execute on function public.change_user_role(uuid, text) to authenticated;
revoke execute on function public.change_user_role(uuid, text) from anon;


commit;
