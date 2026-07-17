-- ============================================================
-- Migration: fix_portal_approval_workflow
-- Created: 2026-07-17
-- Purpose:
--   1. Add missing UNIQUE constraint on organizations.name
--      (required by ON CONFLICT (name) in approval RPCs)
--   2. Extend notification type constraint to include portal
--      approval/rejection types used by the backend
--   3. Fix the approve_portal_application RPC: update profiles.organization_id
--      so hospital_staff users have a non-null organization_id, enabling
--      the auth/callback portal resolution to work correctly
--   4. Remove the insecure anon GRANT on portal_applications
-- ============================================================

begin;

-- ══════════════════════════════════════════════════════════════════════
-- 1. UNIQUE constraint on organizations.name
--    The approval RPCs use ON CONFLICT (name) but no explicit constraint
--    was declared in the original migration.
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
-- 2. Extend notification type constraint
--    The backend admin routes insert notifications with type 'system'
--    (already valid after the backend fix).
--    However, we also need 'application_approved', 'application_rejected',
--    and 'sos_alert' for future use.  Extend the check constraint safely.
--
--    Strategy: drop and recreate the constraint since ALTER TABLE …
--    ALTER CONSTRAINT cannot change the expression.
-- ══════════════════════════════════════════════════════════════════════
do $$
begin
  -- Remove old constraint if it exists (it may not if a previous migration
  -- left it under the original name)
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
      -- original types
      'request_submitted',
      'request_accepted',
      'responder_on_the_way',
      'responder_nearby',
      'responder_arrived',
      'request_completed',
      'request_cancelled',
      'new_message',
      'assignment_received',
      'system',
      -- portal workflow types
      'application_approved',
      'application_rejected',
      -- SOS alert type
      'sos_alert',
      -- recommendation type
      'recommendation',
      -- success / error aliases used by older code (kept for compatibility)
      'success',
      'error',
      'info',
      'warning'
    )
  );


-- ══════════════════════════════════════════════════════════════════════
-- 3. Replace approve_portal_application RPC
--    New version also sets profiles.organization_id so the auth callback
--    can find the membership immediately after approval.
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
    v_log_id          bigint;
begin
    v_admin_id := auth.uid();

    if v_admin_id is null then
        raise exception 'User must be authenticated';
    end if;

    -- Verify caller is admin from the database — never trust client value
    if not exists (
        select 1 from public.profiles
        where id = v_admin_id and role = 'admin'
    ) then
        raise exception 'Unauthorized: User is not an admin';
    end if;

    -- Lock and fetch the application row
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
        raise exception 'Application is not pending (current status: %)', v_application.status;
    end if;

    -- Mark application as approved
    update public.portal_applications
    set
        status      = 'approved',
        reviewed_by = v_admin_id,
        reviewed_at = now(),
        updated_at  = now()
    where id = p_application_id;

    -- ── Hospital approval path ──────────────────────────────────────
    if v_application.application_type = 'hospital' then

        -- 1. Upsert the organization
        insert into public.organizations (
            name, organization_type, address, phone, is_verified, created_at, updated_at
        ) values (
            coalesce(v_application.organization_name, 'Hospital ' || substr(p_application_id::text, 1, 8)),
            'hospital',
            v_application.address,
            v_application.phone,
            true, now(), now()
        )
        on conflict (name) do update set
            address     = excluded.address,
            phone       = excluded.phone,
            is_verified = true,
            updated_at  = now()
        returning id into v_organization_id;

        -- 2. Create organization membership (owner role)
        insert into public.organization_members (
            user_id, organization_id, member_role, status, created_at, updated_at
        ) values (
            v_application.user_id, v_organization_id, 'owner', 'approved', now(), now()
        ) on conflict (organization_id, user_id) do update set
            status     = 'approved',
            updated_at = now();

        -- 3. Update profile: role + organization_id
        --    This is guarded by the protect_profile_auth_fields trigger when the
        --    caller is auth.uid() == profile.id.  Since this is security definer
        --    running as the service context, the trigger fires but v_admin_id ≠
        --    v_application.user_id so the guard does NOT block the update.
        --    We use a direct UPDATE here which bypasses client-side RLS.
        update public.profiles
        set
            role            = 'hospital_staff',
            organization_id = v_organization_id,
            updated_at      = now()
        where id = v_application.user_id;

    -- ── Responder approval path ─────────────────────────────────────
    elsif v_application.application_type = 'responder' then

        update public.profiles
        set
            role       = 'responder',
            updated_at = now()
        where id = v_application.user_id;

    end if;

    -- ── Audit log ───────────────────────────────────────────────────
    insert into public.audit_logs (
        actor_id, action, entity_type, entity_id, old_data, new_data
    ) values (
        v_admin_id,
        'application_approved',
        'portal_application',
        p_application_id::text,
        jsonb_build_object('status', 'pending'),
        jsonb_build_object(
            'status', 'approved',
            'application_type', v_application.application_type,
            'organization_id', v_organization_id
        )
    ) returning id into v_log_id;

    -- ── In-app notification for the applicant ───────────────────────
    insert into public.notifications (
        recipient_id, type, title, message
    ) values (
        v_application.user_id,
        'application_approved',
        'Application Approved',
        'Your ' || v_application.application_type || ' application has been approved. You can now log in to access your portal.'
    );

    return jsonb_build_object(
        'success',          true,
        'application_id',   p_application_id,
        'organization_id',  v_organization_id,
        'audit_log_id',     v_log_id
    );
end;
$$;

grant  execute on function public.approve_portal_application(uuid) to authenticated;
revoke execute on function public.approve_portal_application(uuid) from anon;


-- ══════════════════════════════════════════════════════════════════════
-- 4. Replace reject_portal_application RPC (notification type fix)
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
    v_log_id      bigint;
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

    insert into public.audit_logs (
        actor_id, action, entity_type, entity_id, old_data, new_data
    ) values (
        v_admin_id,
        'application_rejected',
        'portal_application',
        p_application_id::text,
        jsonb_build_object('status', 'pending'),
        jsonb_build_object('status', 'rejected', 'reason', p_rejection_reason)
    ) returning id into v_log_id;

    insert into public.notifications (
        recipient_id, type, title, message
    ) values (
        v_application.user_id,
        'application_rejected',
        'Application Rejected',
        'Your ' || v_application.application_type || ' application has been rejected. Reason: ' || p_rejection_reason
    );

    return jsonb_build_object(
        'success',        true,
        'application_id', p_application_id,
        'audit_log_id',   v_log_id
    );
end;
$$;

grant  execute on function public.reject_portal_application(uuid, text) to authenticated;
revoke execute on function public.reject_portal_application(uuid, text) from anon;


-- ══════════════════════════════════════════════════════════════════════
-- 5. Remove insecure anon GRANT on portal_applications
--    Migration 20260715210000 accidentally granted SELECT, UPDATE to anon.
-- ══════════════════════════════════════════════════════════════════════
revoke select, update, insert on public.portal_applications from anon;


-- ══════════════════════════════════════════════════════════════════════
-- 6. Add portal_applications RLS read policy for admin
--    (the policy already exists from 20260715210000, but re-declare
--     as CREATE OR REPLACE using DO block to be idempotent)
-- ══════════════════════════════════════════════════════════════════════
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
-- 7. Add emergency_contacts select policy for admin (needed for SOS flow)
-- ══════════════════════════════════════════════════════════════════════
do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'emergency_contacts'
      and policyname = 'Service role can read emergency contacts'
  ) then
    -- Service role bypasses RLS automatically; this is documentation-only
    -- The backend uses the service-role key to load primary contacts safely.
    null;
  end if;
end $$;


-- ══════════════════════════════════════════════════════════════════════
-- 8. Add get_my_request_stats() RPC — used by user dashboard
-- ══════════════════════════════════════════════════════════════════════
create or replace function public.get_my_request_stats()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_uid   uuid;
    v_stats jsonb;
begin
    v_uid := auth.uid();
    if v_uid is null then
        raise exception 'User must be authenticated';
    end if;

    select jsonb_build_object(
        'total',     count(*),
        'pending',   count(*) filter (where status = 'pending'),
        'active',    count(*) filter (where status in ('accepted', 'in_progress', 'arrived')),
        'completed', count(*) filter (where status = 'completed'),
        'cancelled', count(*) filter (where status = 'cancelled')
    )
    into v_stats
    from public.emergency_requests
    where user_id = v_uid;

    return coalesce(v_stats, '{}'::jsonb);
end;
$$;

grant  execute on function public.get_my_request_stats() to authenticated;
revoke execute on function public.get_my_request_stats() from anon;


-- ══════════════════════════════════════════════════════════════════════
-- 9. Create contact_notifications table (idempotent)
--    Tracks SMS/call delivery for emergency alerts.
--    Backend only — no direct client access.
-- ══════════════════════════════════════════════════════════════════════
create table if not exists public.contact_notifications (
    id                  uuid primary key default gen_random_uuid(),
    emergency_request_id uuid not null references public.emergency_requests(id) on delete cascade,
    contact_id          uuid references public.emergency_contacts(id) on delete set null,
    channel             text not null,          -- 'sms' | 'call'
    notification_type   text not null default 'sos_alert',
    status              text not null default 'queued',
    provider_message_id text,
    error_message       text,
    created_at          timestamptz not null default now(),
    sent_at             timestamptz,

    -- Prevent duplicate alerts for the same request+channel+type
    constraint contact_notifications_unique unique (emergency_request_id, channel, notification_type),
    constraint channel_check check (channel in ('sms', 'call', 'push', 'email')),
    constraint status_check  check (status  in ('queued', 'sent', 'delivered', 'failed', 'undelivered', 'ringing', 'in-progress', 'completed', 'busy', 'no-answer'))
);

create index if not exists contact_notif_request_idx
    on public.contact_notifications (emergency_request_id, created_at desc);

-- RLS: users see only their own request notifications
alter table public.contact_notifications enable row level security;

create policy "Users can view their own contact notifications"
    on public.contact_notifications for select
    using (
        exists (
            select 1 from public.emergency_requests er
            where er.id = contact_notifications.emergency_request_id
              and er.user_id = auth.uid()
        )
    );
-- All writes go through the backend service-role.


commit;
