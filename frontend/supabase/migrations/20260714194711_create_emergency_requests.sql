-- ============================================================
-- Migration: create_emergency_requests
-- Created: 2026-07-14
-- ============================================================

-- 1. Enum types for constrained columns
do $$
begin
  if not exists (select 1 from pg_type where typname = 'emergency_type_enum') then
    create type public.emergency_type_enum as enum (
      'medical', 'accident', 'fire', 'crime', 'flood',
      'electric', 'child_safety', 'elder_care', 'animal_attack', 'other'
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'severity_level_enum') then
    create type public.severity_level_enum as enum ('low', 'medium', 'high', 'critical');
  end if;
  if not exists (select 1 from pg_type where typname = 'emergency_status_enum') then
    create type public.emergency_status_enum as enum (
      'pending', 'accepted', 'volunteer_assigned',
      'hospital_assigned', 'completed', 'cancelled'
    );
  end if;
end $$;

-- 2. Create table
create table if not exists public.emergency_requests (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,

  emergency_type   public.emergency_type_enum   not null,
  severity         public.severity_level_enum   not null,

  -- Description: 10–500 chars
  description      text not null
    constraint description_length check (char_length(trim(description)) between 10 and 500),

  -- Location: GPS coordinates (nullable when manual address provided)
  latitude         double precision,
  longitude        double precision,
  location_accuracy double precision,

  -- Manual address fallback
  manual_address   text,

  -- At least one location source must be present
  constraint location_present check (
    (latitude is not null and longitude is not null)
    or (manual_address is not null and trim(manual_address) <> '')
  ),

  -- Contact number: required, non-empty
  contact_number   text not null
    constraint contact_not_empty check (trim(contact_number) <> ''),

  -- Private storage path (no public URL)
  evidence_path    text,

  status           public.emergency_status_enum not null default 'pending',

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- 3. Index for per-user history queries (most recent first)
create index if not exists idx_emergency_requests_user_created
  on public.emergency_requests (user_id, created_at desc);

-- 4. Automatic updated_at trigger
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

drop trigger if exists emergency_requests_updated_at on public.emergency_requests;
create trigger emergency_requests_updated_at
  before update on public.emergency_requests
  for each row execute function public.set_updated_at();

-- 5. Row Level Security
alter table public.emergency_requests enable row level security;

-- Users can insert only their own rows
create policy "Users can insert own emergency requests"
  on public.emergency_requests
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Users can select only their own rows
create policy "Users can select own emergency requests"
  on public.emergency_requests
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Users cannot freely update status — no update policy for users
-- (status changes will be made server-side by service role in future steps)
