-- ============================================================
-- database_security.sql
-- Medicare Database Security Tests
--
-- PURPOSE: Document and verify RLS and RPC security rules.
--
-- SAFETY:
--   - Run only against a LOCAL or STAGING Supabase environment.
--   - Never run against production with real user data.
--   - Replace UUIDs with real test account IDs before running.
--
-- HOW TO USE:
--   1. Set up two test users (user_a, user_b) and two responder accounts.
--   2. Replace the placeholder UUIDs below.
--   3. Run queries while connected as each role and verify the results.
--
-- Each test documents the EXPECTED RESULT next to the query.
-- ============================================================

-- ── Placeholder IDs (replace before running) ─────────────────────────────
-- :user_a_id       — UUID of normal test user A
-- :user_b_id       — UUID of normal test user B
-- :responder_a_id  — UUID of responder test account A
-- :responder_b_id  — UUID of responder test account B (different request)
-- :request_a_id    — UUID of an emergency request owned by user A
-- :request_b_id    — UUID of an emergency request owned by user B, assigned to responder_a
-- :contact_a_id    — UUID of an emergency contact owned by user A


-- ══════════════════════════════════════════════════════════════════════
-- TEST 1: Normal user cannot read another user's profile
-- ══════════════════════════════════════════════════════════════════════
-- Set JWT to user_a, then run:
-- EXPECTED: 0 rows
select count(*) as should_be_zero
from public.profiles
where id = ':user_b_id'::uuid;


-- ══════════════════════════════════════════════════════════════════════
-- TEST 2: Normal user cannot read another user's emergency requests
-- ══════════════════════════════════════════════════════════════════════
-- Set JWT to user_a, then run:
-- EXPECTED: 0 rows (request_b belongs to user_b)
select count(*) as should_be_zero
from public.emergency_requests
where id = ':request_b_id'::uuid;


-- ══════════════════════════════════════════════════════════════════════
-- TEST 3: User cannot assign themselves as a responder via direct SQL
-- ══════════════════════════════════════════════════════════════════════
-- Set JWT to user_a, then run:
-- EXPECTED: ERROR (no update policy for users on emergency_requests)
-- update public.emergency_requests
-- set assigned_responder_id = ':user_a_id'::uuid
-- where id = ':request_a_id'::uuid;


-- ══════════════════════════════════════════════════════════════════════
-- TEST 4: User cannot change their own role to admin via direct SQL
-- ══════════════════════════════════════════════════════════════════════
-- Set JWT to user_a, then run:
-- EXPECTED: The trigger protect_profile_auth_fields reverts role back to 'user'
-- update public.profiles set role = 'admin' where id = ':user_a_id'::uuid;
-- select role from public.profiles where id = ':user_a_id'::uuid;
-- should_return: 'user'


-- ══════════════════════════════════════════════════════════════════════
-- TEST 5: Responder A cannot see requests assigned to responder B
-- ══════════════════════════════════════════════════════════════════════
-- Set JWT to responder_a, then run:
-- EXPECTED: 0 rows (request owned by user_b assigned to responder_b, not responder_a)
select count(*) as should_be_zero
from public.emergency_requests
where id = ':request_b_id'::uuid
  and assigned_responder_id != ':responder_a_id'::uuid;


-- ══════════════════════════════════════════════════════════════════════
-- TEST 6: Assigned responder can view their assigned request
-- ══════════════════════════════════════════════════════════════════════
-- Set JWT to responder_a, then run:
-- EXPECTED: 1 row (responder_a is assigned to this request)
select count(*) as should_be_one
from public.emergency_requests
where id = ':request_b_id'::uuid
  and assigned_responder_id = ':responder_a_id'::uuid;


-- ══════════════════════════════════════════════════════════════════════
-- TEST 7: Unassigned responder can see pending unassigned requests
-- ══════════════════════════════════════════════════════════════════════
-- Set JWT to responder_b, then run:
-- EXPECTED: ≥0 rows of pending unassigned requests (may be 0 in clean test DB)
select count(*) as pending_unassigned_count
from public.emergency_requests
where status = 'pending'
  and assigned_responder_id is null;


-- ══════════════════════════════════════════════════════════════════════
-- TEST 8: Two responders cannot both accept the same request
-- ══════════════════════════════════════════════════════════════════════
-- Set JWT to responder_a, accept a pending request.
-- Then set JWT to responder_b and try to accept the SAME request.
-- EXPECTED second call: raises 'Request is not available for acceptance'
-- select public.accept_emergency_request(':request_a_id'::uuid);  -- responder_a succeeds
-- select public.accept_emergency_request(':request_a_id'::uuid);  -- responder_b fails


-- ══════════════════════════════════════════════════════════════════════
-- TEST 9: Invalid status transition fails
-- ══════════════════════════════════════════════════════════════════════
-- Set JWT to responder_a (assigned to a completed request), then run:
-- EXPECTED: raises 'Cannot transition from terminal state completed'
-- select public.update_emergency_request_status(':request_a_id'::uuid, 'pending');


-- ══════════════════════════════════════════════════════════════════════
-- TEST 10: User can manage only their own emergency contacts
-- ══════════════════════════════════════════════════════════════════════
-- Set JWT to user_b, try to select user_a's contact:
-- EXPECTED: 0 rows
select count(*) as should_be_zero
from public.emergency_contacts
where id = ':contact_a_id'::uuid;


-- ══════════════════════════════════════════════════════════════════════
-- TEST 11: Only one primary emergency contact per user
-- ══════════════════════════════════════════════════════════════════════
-- After calling set_primary_emergency_contact(some_contact_id):
-- EXPECTED: exactly 1 row where is_primary = true for the user
select count(*) as should_be_at_most_one
from public.emergency_contacts
where user_id = ':user_a_id'::uuid
  and is_primary = true;


-- ══════════════════════════════════════════════════════════════════════
-- TEST 12: Users can read only their own notifications
-- ══════════════════════════════════════════════════════════════════════
-- Set JWT to user_a:
-- EXPECTED: only notifications where recipient_id = user_a
select count(*) as should_be_zero_for_user_b_notifs
from public.notifications
where recipient_id = ':user_b_id'::uuid;


-- ══════════════════════════════════════════════════════════════════════
-- TEST 13: Unrelated user cannot read a request conversation
-- ══════════════════════════════════════════════════════════════════════
-- Set JWT to user_b (not owner/responder of request_a), then run:
-- EXPECTED: raises 'Access denied: you are not a participant in this request'
-- select public.get_request_conversation(':request_a_id'::uuid);


-- ══════════════════════════════════════════════════════════════════════
-- TEST 14: Only the assigned responder can update live location
-- ══════════════════════════════════════════════════════════════════════
-- Set JWT to user_a (not a responder), try to insert a location:
-- EXPECTED: RLS violation (user_a's uid ≠ responder_id)
-- insert into public.responder_locations (responder_id, request_id, latitude, longitude)
-- values (':user_a_id', ':request_a_id', 12.0, 77.0);


-- ══════════════════════════════════════════════════════════════════════
-- TEST 15: Emergency evidence is NOT publicly accessible
-- ══════════════════════════════════════════════════════════════════════
-- The emergency-evidence bucket is private (public = false).
-- Attempting to access a storage URL without a valid signed URL
-- must return 400/403. Verify in Supabase Storage UI or via:
-- select public from storage.buckets where id = 'emergency-evidence';
-- EXPECTED: false
select "public" as should_be_false
from storage.buckets
where id = 'emergency-evidence';


-- ══════════════════════════════════════════════════════════════════════
-- TEST 16: Audit logs are not writable by normal users
-- ══════════════════════════════════════════════════════════════════════
-- Set JWT to user_a, try to insert an audit log:
-- EXPECTED: RLS violation (no insert policy for authenticated users)
-- insert into public.audit_logs (actor_id, action, entity_type)
-- values (':user_a_id', 'fake_action', 'profiles');


-- ══════════════════════════════════════════════════════════════════════
-- TEST 17: Profile avatars bucket is private
-- ══════════════════════════════════════════════════════════════════════
select "public" as should_be_false
from storage.buckets
where id = 'profile-avatars';


-- ══════════════════════════════════════════════════════════════════════
-- VERIFICATION QUERIES (run as service_role to verify schema)
-- ══════════════════════════════════════════════════════════════════════

-- List all tables with RLS enabled
select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public'
order by tablename;

-- List all RLS policies
select schemaname, tablename, policyname, cmd, qual
from pg_policies
where schemaname = 'public'
order by tablename, policyname;

-- List all indexes on public schema
select indexname, tablename, indexdef
from pg_indexes
where schemaname = 'public'
order by tablename, indexname;

-- List all triggers
select trigger_name, event_object_table, action_timing, event_manipulation
from information_schema.triggers
where trigger_schema = 'public'
order by event_object_table, trigger_name;

-- List all functions
select routine_name, routine_type, security_type
from information_schema.routines
where routine_schema = 'public'
order by routine_name;

-- Realtime publication tables
select tablename
from pg_publication_tables
where pubname = 'supabase_realtime'
order by tablename;
