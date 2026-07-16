-- ============================================================
-- Migration: configure_realtime_updates
-- Created: 2026-07-15
-- Purpose: Step 15 — Realtime Updates
--
-- What this migration does:
--   1. Safely adds tables to supabase_realtime publication (idempotent).
--   2. Sets REPLICA IDENTITY FULL on request_messages (needed for
--      complete old-row data on UPDATE for deduplication via updated_at).
--   3. Creates RLS policies on realtime.messages for private Broadcast
--      and Presence channel authorization:
--      - request:{requestId}:location  (owner OR assigned responder)
--      - request:{requestId}:presence  (owner OR assigned responder)
--      - responder:{responderId}:assignments (owner of that responderId)
--   4. Does NOT touch emergency_requests publication (already added by
--      migration 20260715120000_database_architecture_audit.sql).
--   5. Preserves all existing RLS policies on data tables.
--   6. No data is deleted or modified.
--
-- Security notes:
--   - Postgres Changes security comes from the authenticated session + RLS
--     on the data tables, NOT from realtime.messages policies.
--   - Private Broadcast/Presence security comes from realtime.messages policies.
--   - Narrow per-row checks; no using (true) for sensitive tables.
-- ============================================================

begin;

-- ══════════════════════════════════════════════════════════════════════
-- 1. ADD MISSING TABLES TO supabase_realtime PUBLICATION
--    emergency_requests already added by migration 20260715120000.
--    Safely add the remaining three tables.
-- ══════════════════════════════════════════════════════════════════════

-- notifications (needed for realtime notification inserts and read-state)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
    raise notice 'Added public.notifications to supabase_realtime';
  else
    raise notice 'public.notifications already in supabase_realtime — skipped';
  end if;
end $$;

-- request_messages (needed for realtime message inserts and read updates)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'request_messages'
  ) then
    alter publication supabase_realtime add table public.request_messages;
    raise notice 'Added public.request_messages to supabase_realtime';
  else
    raise notice 'public.request_messages already in supabase_realtime — skipped';
  end if;
end $$;

-- responder_locations (needed for durable location fallback via Postgres Changes)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'responder_locations'
  ) then
    alter publication supabase_realtime add table public.responder_locations;
    raise notice 'Added public.responder_locations to supabase_realtime';
  else
    raise notice 'public.responder_locations already in supabase_realtime — skipped';
  end if;
end $$;

-- Log the current state
do $$
declare
  v_tables text;
begin
  select string_agg(tablename, ', ' order by tablename)
  into v_tables
  from pg_publication_tables
  where pubname = 'supabase_realtime'
    and schemaname = 'public';
  raise notice 'supabase_realtime tables: %', coalesce(v_tables, '(none)');
end $$;


-- ══════════════════════════════════════════════════════════════════════
-- 2. REPLICA IDENTITY
--    REPLICA IDENTITY FULL is required on request_messages so that
--    UPDATE events include the complete OLD row in the Postgres Changes
--    payload.  This allows the frontend to compare updated_at correctly.
--
--    emergency_requests does not need FULL because we use the new row
--    updated_at for deduplication.
--
--    responder_locations uses UPSERT; FULL not required.
--    notifications: status-only UPDATE (is_read); FULL not required.
-- ══════════════════════════════════════════════════════════════════════
alter table public.request_messages replica identity full;

-- Confirm the change
do $$
declare
  v_identity char;
begin
  select relreplident into v_identity
  from pg_class
  where oid = 'public.request_messages'::regclass;
  -- 'f' = FULL, 'd' = DEFAULT, 'n' = NOTHING, 'i' = INDEX
  raise notice 'request_messages replica identity: %',
    case v_identity
      when 'f' then 'FULL (OK)'
      when 'd' then 'DEFAULT'
      when 'n' then 'NOTHING'
      when 'i' then 'INDEX'
      else v_identity::text
    end;
end $$;


-- ══════════════════════════════════════════════════════════════════════
-- 3. REALTIME PRIVATE BROADCAST / PRESENCE AUTHORIZATION
--
--    Channel naming convention (documented in docs/realtime/CHANNELS.md):
--
--      request:{uuid}:location  — responder broadcasts location; owner receives
--      request:{uuid}:presence  — online/viewing indicator for conversation
--      responder:{uuid}:assignments — responder receives their own assignment events
--
--    Authorization model:
--      The realtime.messages table controls who may send/receive on
--      private channels.  A row is inserted per-message.  The USING
--      expression is evaluated for SELECT (receive) and INSERT (send).
--
--    Security:
--      - auth.uid() must be the request owner OR the assigned responder.
--      - Responder assignment channels are restricted to the matching uid.
--      - These policies do NOT cover Postgres Changes; those are secured
--        by the session JWT + data-table RLS policies.
-- ══════════════════════════════════════════════════════════════════════

-- Helper function: extract the UUID segment from a channel topic.
-- topic format: "prefix:{uuid}:suffix" or "prefix:{uuid}"
-- Returns NULL when the topic does not match the expected format.
create or replace function realtime.extract_uuid_from_topic(
  p_topic text,
  p_position int default 2  -- 1-based position of the UUID segment
)
returns uuid
language plpgsql
immutable
security definer
set search_path = realtime, public
as $$
declare
  v_parts text[];
  v_segment text;
begin
  v_parts := string_to_array(p_topic, ':');
  if array_length(v_parts, 1) < p_position then
    return null;
  end if;
  v_segment := v_parts[p_position];
  begin
    return v_segment::uuid;
  exception when invalid_text_representation then
    return null;
  end;
end;
$$;

comment on function realtime.extract_uuid_from_topic(text, int) is
  'Extracts and validates a UUID from a colon-delimited channel topic string. '
  'Returns NULL when the segment is not a valid UUID.';


-- ── request:{requestId}:location ──────────────────────────────────────
-- Allow only the request owner and the assigned responder.
-- The responder sends; the owner receives.

drop policy if exists "Private location channel: owner and assigned responder" on realtime.messages;
create policy "Private location channel: owner and assigned responder"
  on realtime.messages
  for all                          -- covers INSERT (send) and SELECT (receive)
  using (
    -- Only applies to location channels
    realtime.topic() like 'request:%:location'
    and
    -- The authenticated user must own or be assigned to this request
    exists (
      select 1
      from public.emergency_requests er
      where er.id = realtime.extract_uuid_from_topic(realtime.topic(), 2)
        and (
          er.user_id = auth.uid()
          or er.assigned_responder_id = auth.uid()
        )
    )
  );

comment on policy "Private location channel: owner and assigned responder"
  on realtime.messages is
  'Authorizes private Broadcast on request:{requestId}:location. '
  'Permits only the emergency request owner or the assigned responder.';


-- ── request:{requestId}:presence ──────────────────────────────────────
-- Allow only the request owner and the assigned responder for presence.

drop policy if exists "Private presence channel: owner and assigned responder" on realtime.messages;
create policy "Private presence channel: owner and assigned responder"
  on realtime.messages
  for all
  using (
    realtime.topic() like 'request:%:presence'
    and
    exists (
      select 1
      from public.emergency_requests er
      where er.id = realtime.extract_uuid_from_topic(realtime.topic(), 2)
        and (
          er.user_id = auth.uid()
          or er.assigned_responder_id = auth.uid()
        )
    )
  );

comment on policy "Private presence channel: owner and assigned responder"
  on realtime.messages is
  'Authorizes private Presence on request:{requestId}:presence. '
  'Permits only the emergency request owner or the assigned responder.';


-- ── responder:{responderId}:assignments ──────────────────────────────
-- Allow only the responder whose ID is in the channel topic.

drop policy if exists "Private assignment channel: matching responder only" on realtime.messages;
create policy "Private assignment channel: matching responder only"
  on realtime.messages
  for all
  using (
    realtime.topic() like 'responder:%:assignments'
    and
    -- The UUID in position 2 must match the authenticated user
    realtime.extract_uuid_from_topic(realtime.topic(), 2) = auth.uid()
  );

comment on policy "Private assignment channel: matching responder only"
  on realtime.messages is
  'Authorizes private Broadcast on responder:{responderId}:assignments. '
  'The channel is accessible only when the responderId segment matches auth.uid().';


-- ══════════════════════════════════════════════════════════════════════
-- 4. VERIFY RLS IS STILL ENABLED ON DATA TABLES
--    These checks raise warnings if RLS has been inadvertently disabled.
--    They do not modify any existing policies.
-- ══════════════════════════════════════════════════════════════════════
do $$
declare
  v_table text;
  v_rls_enabled bool;
begin
  for v_table in values
    ('emergency_requests'),
    ('notifications'),
    ('request_messages'),
    ('responder_locations'),
    ('profiles')
  loop
    select relrowsecurity into v_rls_enabled
    from pg_class
    where oid = ('public.' || v_table)::regclass;

    if not v_rls_enabled then
      raise warning 'RLS is DISABLED on public.% — this is a security risk!', v_table;
    else
      raise notice 'RLS verified enabled on public.%', v_table;
    end if;
  end loop;
end $$;


-- ══════════════════════════════════════════════════════════════════════
-- 5. SUPPORTING INDEXES
--    Indexes that improve Realtime filter performance.
--    All are created concurrently where possible; CONCURRENTLY not
--    available inside a transaction, so we use regular CREATE.
-- ══════════════════════════════════════════════════════════════════════

-- Fast lookup for notification channel filter: recipient_id=eq.{userId}
create index if not exists idx_notifications_recipient_unread
  on public.notifications (recipient_id, is_read, created_at desc)
  where is_read = false;

comment on index idx_notifications_recipient_unread is
  'Supports fast unread notification count queries and realtime filtering '
  'by recipient_id for the user:{userId}:notifications channel.';

-- Fast lookup for message channel filter: request_id=eq.{requestId}
create index if not exists idx_request_messages_request_created
  on public.request_messages (request_id, created_at asc);

comment on index idx_request_messages_request_created is
  'Supports chronological message fetching and realtime filter on request_id.';

-- Fast lookup for responder location: request_id=eq.{requestId}
create index if not exists idx_responder_locations_request_updated
  on public.responder_locations (request_id, updated_at desc);

comment on index idx_responder_locations_request_updated is
  'Supports latest-location queries and realtime filtering by request_id.';

-- Fast lookup for pending unassigned requests (available requests list)
create index if not exists idx_emergency_requests_pending_unassigned
  on public.emergency_requests (status, severity, created_at asc)
  where status = 'pending' and assigned_responder_id is null;

comment on index idx_emergency_requests_pending_unassigned is
  'Supports fast available-request listing for responders, ordered by '
  'severity (critical→low) then oldest-first.';

-- Fast lookup for requests assigned to a specific responder
create index if not exists idx_emergency_requests_assigned_responder
  on public.emergency_requests (assigned_responder_id, status, updated_at desc)
  where assigned_responder_id is not null;

comment on index idx_emergency_requests_assigned_responder is
  'Supports scoped Postgres Changes filter: assigned_responder_id=eq.{id}.';


commit;
