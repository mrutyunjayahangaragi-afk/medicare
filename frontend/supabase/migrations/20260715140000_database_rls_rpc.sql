-- ============================================================
-- Migration: database_rls_rpc
-- Created: 2026-07-15
-- Purpose: Additional RLS policies and RPC functions for Step 13
--
-- Tables targeted:
--   notifications (add missing RLS for user_id alias)
--   responder_locations (verify completeness)
--   audit_logs (ensure blocked for normal users)
-- New RPC functions:
--   get_my_emergency_requests()
--   get_request_conversation(request_id)
--   get_my_profile()
-- ============================================================

begin;


-- ══════════════════════════════════════════════════════════════════════
-- 1.  NOTIFICATIONS — update existing policies to also match user_id
-- ══════════════════════════════════════════════════════════════════════

-- Replace the select policy so both recipient_id and user_id aliases work
drop policy if exists "Users can view their own notifications" on public.notifications;
create policy "Users can view their own notifications"
  on public.notifications
  for select
  using (recipient_id = auth.uid() or user_id = auth.uid());

-- Replace the update policy
drop policy if exists "Users can update their own notifications" on public.notifications;
create policy "Users can update their own notifications"
  on public.notifications
  for update
  using (recipient_id = auth.uid() or user_id = auth.uid())
  with check (recipient_id = auth.uid() or user_id = auth.uid());


-- ══════════════════════════════════════════════════════════════════════
-- 2.  RPC: get_my_profile()
--     Returns the authenticated user's profile row.
--     Avoids leaking other users' data even if RLS is misconfigured.
-- ══════════════════════════════════════════════════════════════════════
create or replace function public.get_my_profile()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile jsonb;
begin
  if auth.uid() is null then
    raise exception 'User must be authenticated';
  end if;

  select to_jsonb(p) into v_profile
  from public.profiles p
  where p.id = auth.uid();

  if not found then
    raise exception 'Profile not found';
  end if;

  -- Strip sensitive fields before returning
  v_profile := v_profile
    - 'organization_id'  -- internal field
    - 'is_verified';     -- not user-facing

  return v_profile;
end;
$$;

grant execute on function public.get_my_profile to authenticated;
revoke execute on function public.get_my_profile from anon;


-- ══════════════════════════════════════════════════════════════════════
-- 3.  RPC: get_my_emergency_requests()
--     Returns the current user's requests ordered newest first.
--     Enforces ownership without relying solely on RLS.
-- ══════════════════════════════════════════════════════════════════════
create or replace function public.get_my_emergency_requests()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rows jsonb;
begin
  if auth.uid() is null then
    raise exception 'User must be authenticated';
  end if;

  select coalesce(jsonb_agg(r order by r.created_at desc), '[]'::jsonb)
  into v_rows
  from public.emergency_requests r
  where r.user_id = auth.uid();

  return v_rows;
end;
$$;

grant execute on function public.get_my_emergency_requests to authenticated;
revoke execute on function public.get_my_emergency_requests from anon;


-- ══════════════════════════════════════════════════════════════════════
-- 4.  RPC: get_request_conversation(p_request_id)
--     Returns the message thread for a request.
--     Only the request owner and assigned responder may call this.
-- ══════════════════════════════════════════════════════════════════════
create or replace function public.get_request_conversation(
  p_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.emergency_requests;
  v_messages jsonb;
begin
  if auth.uid() is null then
    raise exception 'User must be authenticated';
  end if;

  select * into v_request
  from public.emergency_requests
  where id = p_request_id;

  if not found then
    raise exception 'Request not found';
  end if;

  -- Enforce participant check
  if v_request.user_id != auth.uid()
     and v_request.assigned_responder_id is distinct from auth.uid() then
    raise exception 'Access denied: you are not a participant in this request';
  end if;

  select coalesce(jsonb_agg(m order by m.created_at asc), '[]'::jsonb)
  into v_messages
  from public.request_messages m
  where m.request_id = p_request_id;

  return jsonb_build_object(
    'request_id', p_request_id,
    'messages',   v_messages
  );
end;
$$;

grant execute on function public.get_request_conversation to authenticated;
revoke execute on function public.get_request_conversation from anon;


-- ══════════════════════════════════════════════════════════════════════
-- 5.  AUDIT HELPER — write_audit_log()
--     Called by service_role backend only; not exposed to anon/authenticated.
-- ══════════════════════════════════════════════════════════════════════
create or replace function public.write_audit_log(
  p_actor_id    uuid,
  p_action      text,
  p_entity_type text,
  p_entity_id   text      default null,
  p_old_data    jsonb     default null,
  p_new_data    jsonb     default null,
  p_ip_address  inet      default null,
  p_user_agent  text      default null
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id bigint;
begin
  insert into public.audit_logs (
    actor_id, action, entity_type, entity_id,
    old_data, new_data, ip_address, user_agent
  ) values (
    p_actor_id, p_action, p_entity_type, p_entity_id,
    p_old_data, p_new_data, p_ip_address, p_user_agent
  ) returning id into v_id;

  return v_id;
end;
$$;

-- Explicitly NOT granted to authenticated or anon.
-- Only service_role (trusted backend) may call this.
revoke execute on function public.write_audit_log from public;
revoke execute on function public.write_audit_log from anon;
revoke execute on function public.write_audit_log from authenticated;


-- ══════════════════════════════════════════════════════════════════════
-- 6.  PROFILES — add upsert RPC for the auth callback
--     The frontend auth/callback route upserts profiles; this RPC
--     provides a safe server-side path for the FastAPI backend.
-- ══════════════════════════════════════════════════════════════════════
create or replace function public.upsert_profile_on_signup(
  p_user_id     uuid,
  p_full_name   text   default null,
  p_email       text   default null,
  p_avatar_url  text   default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, avatar_url, role, is_verified)
  values (p_user_id, p_full_name, p_email, p_avatar_url, 'user', false)
  on conflict (id) do update
    set
      full_name  = coalesce(excluded.full_name, profiles.full_name),
      email      = coalesce(excluded.email,     profiles.email),
      avatar_url = coalesce(excluded.avatar_url, profiles.avatar_url),
      updated_at = now()
    where profiles.full_name is null
       or profiles.email     is null;
end;
$$;

revoke execute on function public.upsert_profile_on_signup from public;
revoke execute on function public.upsert_profile_on_signup from anon;
revoke execute on function public.upsert_profile_on_signup from authenticated;
-- Called by service_role only


commit;
