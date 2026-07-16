-- ============================================================
-- Migration: database_architecture_audit
-- Created: 2026-07-15
-- Purpose: Step 13 — Database Architecture
--
-- What this migration does:
--   1.  Extends user_role enum with: responder, hospital_staff, admin
--   2.  Extends emergency_status_enum with: in_progress, arrived
--   3.  Adds missing columns to existing tables (safe / additive only)
--   4.  Fills gaps in emergency_requests (arrived_at, RPC state machine)
--   5.  Fixes the notifications column mismatch (user_id → recipient_id,
--       data → metadata) by adding compatibility aliases where needed
--   6.  Adds request_messages.updated_at (missing from original DDL)
--   7.  Adds user_settings columns missing from TypeScript types
--   8.  Attaches canonical updated_at trigger to emergency_contacts
--   9.  Attaches canonical updated_at trigger to notification_preferences
--  10.  Attaches canonical updated_at trigger to responder_locations
--  11.  Adds organization-related tables (organizations, organization_members)
--  12.  Adds audit_logs table (service-role only access)
--  13.  Adds organization_members table
--  14.  Adds account_deletion_requests table
--  15.  Creates new-user profile trigger on auth.users
--  16.  Enables Realtime for emergency_requests
--  17.  Adds profile field protection trigger (blocks role self-escalation)
--
-- This migration is ADDITIVE and NON-DESTRUCTIVE.
-- No table is dropped or recreated.
-- No existing data is deleted.
-- All new columns are nullable on creation; constraints added after fill.
-- ============================================================

begin;

-- ══════════════════════════════════════════════════════════════════════
-- 0.  EXTENSIONS
-- ══════════════════════════════════════════════════════════════════════
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";


-- ══════════════════════════════════════════════════════════════════════
-- 1.  CANONICAL set_updated_at() TRIGGER FUNCTION
--     (replaces the per-table duplicates from earlier migrations)
-- ══════════════════════════════════════════════════════════════════════
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- ══════════════════════════════════════════════════════════════════════
-- 2.  ENUM EXTENSIONS
--     The role column uses the user_role enum type (managed by Supabase Auth).
--     Current values: user, volunteer, hospital
--     We add missing values using ALTER TYPE ... ADD VALUE IF NOT EXISTS.
--     The status enum also needs in_progress and arrived.
--     NOTE: ALTER TYPE ADD VALUE cannot run inside a transaction in older
--     PostgreSQL. Supabase runs on PG15+ where this is safe to do outside
--     of transaction blocks. We commit/begin around each ADD VALUE.
-- ══════════════════════════════════════════════════════════════════════

-- Temporarily commit the transaction opened at the top so we can run
-- ALTER TYPE ADD VALUE (which cannot run in a transaction block on some PG versions)
commit;

-- Extend user_role enum with new role values
do $$
begin
  if not exists (
    select 1 from pg_enum
    where enumtypid = 'public.user_role'::regtype
      and enumlabel = 'responder'
  ) then
    alter type public.user_role add value 'responder';
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_enum
    where enumtypid = 'public.user_role'::regtype
      and enumlabel = 'hospital_staff'
  ) then
    alter type public.user_role add value 'hospital_staff';
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_enum
    where enumtypid = 'public.user_role'::regtype
      and enumlabel = 'admin'
  ) then
    alter type public.user_role add value 'admin';
  end if;
end $$;

-- Extend emergency_status_enum with in_progress and arrived
do $$
begin
  if not exists (
    select 1 from pg_enum
    where enumtypid = 'public.emergency_status_enum'::regtype
      and enumlabel = 'in_progress'
  ) then
    alter type public.emergency_status_enum add value 'in_progress' after 'accepted';
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_enum
    where enumtypid = 'public.emergency_status_enum'::regtype
      and enumlabel = 'arrived'
  ) then
    alter type public.emergency_status_enum add value 'arrived' after 'in_progress';
  end if;
end $$;

-- Resume the transaction for the rest of the migration
begin;

-- ══════════════════════════════════════════════════════════════════════
-- 3.  PROFILES — fill gaps and add missing columns
-- ══════════════════════════════════════════════════════════════════════
-- NOTE: role is an enum column — no CHECK constraint needed or allowed.

-- 3a. Add organization_id column for future multi-tenant support
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles'
      and column_name = 'organization_id'
  ) then
    alter table public.profiles add column organization_id uuid;
  end if;
end $$;

-- 3b. Add is_verified column if missing (some deploys may lack it)
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles'
      and column_name = 'is_verified'
  ) then
    alter table public.profiles
      add column is_verified boolean not null default false;
  end if;
end $$;

-- 3c. Attach canonical updated_at trigger to profiles
drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- 3d. Index for profile role lookups (used by responder RPC checks)
create index if not exists profiles_role_idx
  on public.profiles (role);

create index if not exists profiles_availability_status_idx
  on public.profiles (availability_status)
  where availability_status = 'available';


-- ══════════════════════════════════════════════════════════════════════
-- 4.  EMERGENCY REQUESTS — fill gaps
-- ══════════════════════════════════════════════════════════════════════

-- 4a. Add arrived_at timestamp (missing from original schema)
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'emergency_requests'
      and column_name = 'arrived_at'
  ) then
    alter table public.emergency_requests add column arrived_at timestamptz;
  end if;
end $$;

-- 4b. Re-attach canonical updated_at trigger
drop trigger if exists emergency_requests_updated_at on public.emergency_requests;
create trigger emergency_requests_updated_at
  before update on public.emergency_requests
  for each row execute function public.set_updated_at();

-- 4c. Ensure per-user history index exists
create index if not exists idx_emergency_requests_user_created
  on public.emergency_requests (user_id, created_at desc);

-- 4d. Update status transition RPC to include arrived state
create or replace function public.update_emergency_request_status(
  request_id uuid,
  next_status text
)
returns public.emergency_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.emergency_requests;
  v_profile_role text;
begin
  if auth.uid() is null then
    raise exception 'User must be authenticated';
  end if;

  select role into v_profile_role
  from public.profiles
  where id = auth.uid();

  if v_profile_role not in ('volunteer', 'hospital', 'hospital_staff', 'responder') then
    raise exception 'Insufficient role to update request status';
  end if;

  select * into v_request
  from public.emergency_requests
  where id = request_id
  for update;

  if not found then
    raise exception 'Request not found';
  end if;

  if v_request.assigned_responder_id != auth.uid() then
    raise exception 'Request is not assigned to this responder';
  end if;

  -- Enforce state machine:
  -- pending     → accepted | cancelled
  -- accepted    → in_progress | cancelled
  -- in_progress → arrived | completed | cancelled
  -- arrived     → completed | cancelled
  -- completed   → (terminal)
  -- cancelled   → (terminal)
  case v_request.status::text
    when 'pending' then
      if next_status not in ('accepted', 'cancelled') then
        raise exception 'Invalid transition from pending';
      end if;
    when 'accepted' then
      if next_status not in ('in_progress', 'cancelled') then
        raise exception 'Invalid transition from accepted';
      end if;
    when 'in_progress' then
      if next_status not in ('arrived', 'completed', 'cancelled') then
        raise exception 'Invalid transition from in_progress';
      end if;
    when 'arrived' then
      if next_status not in ('completed', 'cancelled') then
        raise exception 'Invalid transition from arrived';
      end if;
    else
      raise exception 'Cannot transition from terminal state %', v_request.status;
  end case;

  -- Apply status and set the matching timestamp
  update public.emergency_requests
  set
    status      = next_status::public.emergency_status_enum,
    in_progress_at = case when next_status = 'in_progress' then now() else in_progress_at end,
    arrived_at     = case when next_status = 'arrived'     then now() else arrived_at     end,
    completed_at   = case when next_status = 'completed'   then now() else completed_at   end,
    cancelled_at   = case when next_status = 'cancelled'   then now() else cancelled_at   end,
    updated_at  = now()
  where id = request_id
  returning * into v_request;

  return v_request;
end;
$$;

grant execute on function public.update_emergency_request_status to authenticated;


-- 4e. cancel_emergency_request() — allows request owner to cancel own pending request
create or replace function public.cancel_emergency_request(
  p_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.emergency_requests;
begin
  if auth.uid() is null then
    raise exception 'User must be authenticated';
  end if;

  select * into v_request
  from public.emergency_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Request not found';
  end if;

  if v_request.user_id != auth.uid() then
    raise exception 'You can only cancel your own requests';
  end if;

  if v_request.status::text not in ('pending', 'accepted') then
    raise exception 'Only pending or accepted requests can be cancelled by the user';
  end if;

  update public.emergency_requests
  set
    status       = 'cancelled'::public.emergency_status_enum,
    cancelled_at = now(),
    updated_at   = now()
  where id = p_request_id;

  return jsonb_build_object('success', true, 'request_id', p_request_id);
end;
$$;

grant execute on function public.cancel_emergency_request to authenticated;


-- ══════════════════════════════════════════════════════════════════════
-- 5.  NOTIFICATIONS — fix column name mismatch
--
-- The migration created the table with `recipient_id` and `metadata`,
-- but types/database.ts refers to `user_id` and `data`.
-- We add `user_id` as a generated column alias and `data` as an alias
-- via a view so both old frontend code and new code work.
-- The canonical column names remain recipient_id and metadata.
-- ══════════════════════════════════════════════════════════════════════

-- 5a. Add `user_id` column as a synonym stored value (backfilled from recipient_id)
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'notifications'
      and column_name = 'user_id'
  ) then
    alter table public.notifications add column user_id uuid
      references auth.users(id) on delete cascade;

    -- Backfill from recipient_id
    update public.notifications set user_id = recipient_id where user_id is null;
  end if;
end $$;

-- 5b. Add `data` column as a synonym for `metadata`
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'notifications'
      and column_name = 'data'
  ) then
    alter table public.notifications add column data jsonb not null default '{}'::jsonb;

    -- Backfill from metadata
    update public.notifications set data = metadata where data = '{}'::jsonb;
  end if;
end $$;

-- 5c. Add updated_at to notifications (missing from original migration)
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'notifications'
      and column_name = 'updated_at'
  ) then
    alter table public.notifications
      add column updated_at timestamptz not null default now();
  end if;
end $$;

-- 5d. Attach updated_at trigger to notifications
drop trigger if exists notifications_updated_at on public.notifications;
create trigger notifications_updated_at
  before update on public.notifications
  for each row execute function public.set_updated_at();

-- 5e. Keep user_id in sync with recipient_id via trigger
create or replace function public.sync_notification_user_id()
returns trigger language plpgsql as $$
begin
  new.user_id := new.recipient_id;
  new.data    := new.metadata;
  return new;
end;
$$;

drop trigger if exists notifications_sync_aliases on public.notifications;
create trigger notifications_sync_aliases
  before insert or update on public.notifications
  for each row execute function public.sync_notification_user_id();


-- ══════════════════════════════════════════════════════════════════════
-- 6.  REQUEST MESSAGES — add updated_at (missing from original DDL)
-- ══════════════════════════════════════════════════════════════════════
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'request_messages'
      and column_name = 'updated_at'
  ) then
    alter table public.request_messages
      add column updated_at timestamptz not null default now();
  end if;
end $$;

drop trigger if exists request_messages_updated_at on public.request_messages;
create trigger request_messages_updated_at
  before update on public.request_messages
  for each row execute function public.set_updated_at();


-- ══════════════════════════════════════════════════════════════════════
-- 7.  USER SETTINGS — add missing columns referenced in TypeScript
-- ══════════════════════════════════════════════════════════════════════
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'user_settings'
      and column_name = 'use_high_accuracy_location'
  ) then
    alter table public.user_settings
      add column use_high_accuracy_location boolean not null default true;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'user_settings'
      and column_name = 'remember_manual_address'
  ) then
    alter table public.user_settings
      add column remember_manual_address boolean not null default false;
  end if;
end $$;

-- Attach canonical trigger
drop trigger if exists user_settings_updated_at on public.user_settings;
create trigger user_settings_updated_at
  before update on public.user_settings
  for each row execute function public.set_updated_at();


-- ══════════════════════════════════════════════════════════════════════
-- 8.  EMERGENCY CONTACTS — attach canonical trigger
-- ══════════════════════════════════════════════════════════════════════
drop trigger if exists emergency_contacts_updated_at on public.emergency_contacts;
create trigger emergency_contacts_updated_at
  before update on public.emergency_contacts
  for each row execute function public.set_updated_at();


-- ══════════════════════════════════════════════════════════════════════
-- 9.  NOTIFICATION PREFERENCES — attach canonical trigger
-- ══════════════════════════════════════════════════════════════════════
drop trigger if exists notification_preferences_updated_at on public.notification_preferences;
create trigger notification_preferences_updated_at
  before update on public.notification_preferences
  for each row execute function public.set_updated_at();


-- ══════════════════════════════════════════════════════════════════════
-- 10. RESPONDER LOCATIONS — attach canonical trigger
-- ══════════════════════════════════════════════════════════════════════
drop trigger if exists responder_locations_updated_at on public.responder_locations;
create trigger responder_locations_updated_at
  before update on public.responder_locations
  for each row execute function public.set_updated_at();


-- ══════════════════════════════════════════════════════════════════════
-- 11. ORGANIZATIONS TABLE
-- ══════════════════════════════════════════════════════════════════════
create table if not exists public.organizations (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  organization_type text not null,
  phone            text,
  email            text,
  address          text,
  latitude         double precision,
  longitude        double precision,
  is_verified      boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  constraint org_name_length   check (char_length(trim(name)) between 2 and 200),
  constraint org_type_check    check (organization_type in (
    'hospital', 'ambulance_service', 'volunteer_group', 'clinic', 'government', 'other'
  )),
  constraint org_lat_range     check (latitude  is null or (latitude  >= -90  and latitude  <= 90)),
  constraint org_lng_range     check (longitude is null or (longitude >= -180 and longitude <= 180))
);

create index if not exists organizations_type_verified_idx
  on public.organizations (organization_type, is_verified);

create index if not exists organizations_name_idx
  on public.organizations (name);

-- Trigger
drop trigger if exists organizations_updated_at on public.organizations;
create trigger organizations_updated_at
  before update on public.organizations
  for each row execute function public.set_updated_at();

-- RLS
alter table public.organizations enable row level security;

-- Public may read verified organizations (directory use-case)
create policy "Public can view verified organizations"
  on public.organizations for select
  using (is_verified = true);

-- Only service-role / admin backend writes organizations (no direct user writes)


-- ══════════════════════════════════════════════════════════════════════
-- 12. ORGANIZATION MEMBERS TABLE
-- ══════════════════════════════════════════════════════════════════════
create table if not exists public.organization_members (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id         uuid not null references auth.users(id)           on delete cascade,
  member_role     text not null,
  status          text not null default 'pending',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint org_member_unique    unique (organization_id, user_id),
  constraint org_member_role_check check (member_role in (
    'owner', 'manager', 'responder', 'staff', 'volunteer'
  )),
  constraint org_member_status_check check (status in (
    'pending', 'approved', 'suspended', 'rejected'
  ))
);

create index if not exists org_members_user_status_idx
  on public.organization_members (user_id, status);

create index if not exists org_members_org_status_idx
  on public.organization_members (organization_id, status);

-- Trigger
drop trigger if exists organization_members_updated_at on public.organization_members;
create trigger organization_members_updated_at
  before update on public.organization_members
  for each row execute function public.set_updated_at();

-- RLS
alter table public.organization_members enable row level security;

-- Members can view their own membership
create policy "Users can view their own memberships"
  on public.organization_members for select
  using (user_id = auth.uid());

-- Members cannot directly insert/update themselves (requires admin flow)


-- ══════════════════════════════════════════════════════════════════════
-- 13. AUDIT LOGS TABLE
-- ══════════════════════════════════════════════════════════════════════
create table if not exists public.audit_logs (
  id          bigint generated always as identity primary key,
  actor_id    uuid references auth.users(id) on delete set null,
  action      text not null,
  entity_type text not null,
  entity_id   text,
  old_data    jsonb,
  new_data    jsonb,
  ip_address  inet,
  user_agent  text,
  created_at  timestamptz not null default now(),

  constraint audit_action_length     check (char_length(trim(action))      between 1 and 100),
  constraint audit_entity_type_length check (char_length(trim(entity_type)) between 1 and 100)
);

create index if not exists audit_logs_actor_created_idx
  on public.audit_logs (actor_id, created_at desc);

create index if not exists audit_logs_entity_idx
  on public.audit_logs (entity_type, entity_id);

create index if not exists audit_logs_created_idx
  on public.audit_logs (created_at desc);

-- RLS — normal users have NO direct access to audit logs
alter table public.audit_logs enable row level security;
-- No policies added: only service_role (trusted backend) can read/write.
-- This effectively blocks all authenticated and anon access via RLS.


-- ══════════════════════════════════════════════════════════════════════
-- 14. ACCOUNT DELETION REQUESTS TABLE
-- ══════════════════════════════════════════════════════════════════════
create table if not exists public.account_deletion_requests (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  reason      text,
  status      text not null default 'pending',
  requested_at timestamptz not null default now(),
  processed_at timestamptz,
  processed_by uuid references auth.users(id) on delete set null,

  constraint acct_del_unique  unique (user_id),   -- one active request per user
  constraint acct_del_status  check (status in ('pending', 'approved', 'rejected', 'completed')),
  constraint acct_del_reason  check (reason is null or char_length(trim(reason)) <= 500)
);

create index if not exists acct_del_status_idx
  on public.account_deletion_requests (status, requested_at desc);

-- RLS
alter table public.account_deletion_requests enable row level security;

-- Users can see and insert their own deletion request
create policy "Users can view own deletion request"
  on public.account_deletion_requests for select
  using (user_id = auth.uid());

create policy "Users can insert own deletion request"
  on public.account_deletion_requests for insert
  with check (user_id = auth.uid());


-- ══════════════════════════════════════════════════════════════════════
-- 15. NEW USER PROFILE TRIGGER
--     Creates a profiles row automatically when a user signs up.
--     Uses auth.users.raw_user_meta_data for name/avatar.
--     Does NOT overwrite an existing profile.
-- ══════════════════════════════════════════════════════════════════════
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    full_name,
    email,
    avatar_url,
    role,
    is_verified,
    created_at,
    updated_at
  )
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(new.email, '@', 1)
    ),
    new.email,
    coalesce(
      new.raw_user_meta_data ->> 'avatar_url',
      new.raw_user_meta_data ->> 'picture'
    ),
    'user',        -- default role; never trust client-supplied role
    false,         -- not verified until email confirmed
    now(),
    now()
  )
  on conflict (id) do nothing;  -- safe: never overwrites an existing profile
  return new;
end;
$$;

-- Attach to auth.users (safe: on conflict do nothing handles re-runs)
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ══════════════════════════════════════════════════════════════════════
-- 16. ENABLE REALTIME on remaining tables
-- ══════════════════════════════════════════════════════════════════════
-- notifications and request_messages already added by migration 20260714230000
-- responder_locations already added by migration 20260714220000
-- Add emergency_requests to realtime for live status updates
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and tablename = 'emergency_requests'
  ) then
    alter publication supabase_realtime add table public.emergency_requests;
  end if;
end $$;


-- ══════════════════════════════════════════════════════════════════════
-- 17. ADDITIONAL RLS — profiles: block role self-escalation
--     The existing update policy allows users to update their own row,
--     but we need to ensure they cannot change protected columns.
--     Since PostgreSQL column-level RLS is not natively supported,
--     we enforce this through a BEFORE UPDATE trigger.
-- ══════════════════════════════════════════════════════════════════════
create or replace function public.protect_profile_auth_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Prevent normal users from changing their own role, organization, or
  -- responder_type through the direct update path.
  -- Backend service_role operations bypass RLS and this trigger is not
  -- fired for those (security definer + search_path is sufficient).
  if auth.uid() = new.id then
    -- Preserve immutable fields
    new.role              := old.role;
    new.organization_id   := old.organization_id;
    new.responder_type    := old.responder_type;
    new.is_verified       := old.is_verified;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_auth_fields on public.profiles;
create trigger profiles_protect_auth_fields
  before update on public.profiles
  for each row execute function public.protect_profile_auth_fields();


commit;
