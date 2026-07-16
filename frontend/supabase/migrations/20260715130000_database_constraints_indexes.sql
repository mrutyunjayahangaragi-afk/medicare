-- ============================================================
-- Migration: database_constraints_indexes
-- Created: 2026-07-15
-- Purpose: Add missing constraints and performance indexes
--
-- This migration is safe to run after 20260715120000.
-- All changes are additive; no existing data is deleted.
-- ============================================================

begin;


-- ══════════════════════════════════════════════════════════════════════
-- 1.  EMERGENCY REQUESTS — add missing constraints
-- ══════════════════════════════════════════════════════════════════════

-- Coordinate range constraints (lat/lon can be null, but if set must be valid)
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'emergency_requests_lat_range'
  ) then
    alter table public.emergency_requests
      add constraint emergency_requests_lat_range
      check (latitude  is null or (latitude  >= -90  and latitude  <= 90));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'emergency_requests_lng_range'
  ) then
    alter table public.emergency_requests
      add constraint emergency_requests_lng_range
      check (longitude is null or (longitude >= -180 and longitude <= 180));
  end if;
end $$;

-- Contact number length
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'emergency_requests_contact_length'
  ) then
    alter table public.emergency_requests
      add constraint emergency_requests_contact_length
      check (char_length(trim(contact_number)) between 7 and 20);
  end if;
end $$;


-- ══════════════════════════════════════════════════════════════════════
-- 2.  NOTIFICATIONS — add missing constraints
-- ══════════════════════════════════════════════════════════════════════

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'notifications_title_length'
  ) then
    alter table public.notifications
      add constraint notifications_title_length
      check (char_length(trim(title)) between 1 and 200);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'notifications_message_length'
  ) then
    alter table public.notifications
      add constraint notifications_message_length
      check (char_length(trim(message)) between 1 and 500);
  end if;
end $$;


-- ══════════════════════════════════════════════════════════════════════
-- 3.  REQUEST MESSAGES — ensure indexes cover all query patterns
-- ══════════════════════════════════════════════════════════════════════

-- Already created by 20260714230000:
--   request_messages_request_created_idx  → (request_id, created_at asc)
--   request_messages_recipient_unread_idx → (recipient_id, is_read, created_at desc)
-- Add sender index if missing
create index if not exists request_messages_sender_created_idx
  on public.request_messages (sender_id, created_at desc);


-- ══════════════════════════════════════════════════════════════════════
-- 4.  RESPONDER LOCATIONS — additional composite index
-- ══════════════════════════════════════════════════════════════════════

create index if not exists responder_locations_responder_request_idx
  on public.responder_locations (responder_id, request_id);


-- ══════════════════════════════════════════════════════════════════════
-- 5.  PROFILES — additional performance indexes
-- ══════════════════════════════════════════════════════════════════════

create index if not exists profiles_organization_id_idx
  on public.profiles (organization_id)
  where organization_id is not null;


-- ══════════════════════════════════════════════════════════════════════
-- 6.  AUDIT LOGS — partial index for unprocessed entries
-- ══════════════════════════════════════════════════════════════════════

-- Account deletion — pending
create index if not exists acct_del_pending_idx
  on public.account_deletion_requests (requested_at desc)
  where status = 'pending';


commit;
