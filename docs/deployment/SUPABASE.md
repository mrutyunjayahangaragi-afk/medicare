# Supabase Production Setup

## Project

Use the intended production Supabase project. Do not run migrations against a development or shared project by mistake.

## Migrations

All migrations live in a single canonical location:

```
frontend/supabase/migrations/
```

There is no separate `backend/supabase/migrations/` directory. Apply all 16 migrations in chronological order.

### Apply Migrations

```bash
# From the project root (requires Supabase CLI)
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
supabase migration list   # verify all migrations show as applied
supabase db lint          # check for RLS warnings
```

**Never run `supabase db reset` against production.** That drops all data.

### Migration List

| File | Purpose |
|---|---|
| `20260714194711_create_emergency_requests.sql` | Core emergency requests table |
| `20260714194712_create_emergency_evidence_storage.sql` | Storage bucket policies |
| `20260714210600_add_responder_assignment.sql` | Responder assignment columns |
| `20260714220000_create_responder_locations.sql` | Realtime location tracking |
| `20260714230000_add_notifications_and_messaging.sql` | Notifications + messages |
| `20260714231000_add_contacts_profile_settings.sql` | Emergency contacts + profile settings |
| `20260715001000_enable_profiles_rls.sql` | RLS on profiles table |
| `20260715120000_database_architecture_audit.sql` | Schema audit fixes |
| `20260715130000_database_constraints_indexes.sql` | Constraints and performance indexes |
| `20260715140000_database_rls_rpc.sql` | RLS policies + secure RPC functions |
| `20260715150000_configure_realtime_updates.sql` | Realtime publication entries |
| `20260715160000_add_ai_assistant.sql` | AI conversation tables |
| `20260715200000_add_hospital_portal.sql` | Hospital portal tables |
| `20260715210000_add_portal_applications.sql` | Portal application workflow |
| `20260715220000_add_admin_functions.sql` | Admin management functions |
| `20260716000000_fix_audit_rpc_grants.sql` | Security fix: audit log RLS + admin RPC auth.uid() |

## Required Tables

Verify these exist after migration:

- `profiles`
- `portal_applications`
- `organizations`
- `organization_members`
- `emergency_requests`
- `emergency_contacts`
- `notifications`
- `request_messages`
- `responder_locations`
- `audit_logs`
- `account_deletion_requests`
- `ai_conversations`
- `ai_messages`
- `ai_usage`

## RLS Verification

RLS must be enabled on every user-data table. Spot-check these isolation rules:

| Rule | How to test |
|---|---|
| User A cannot read User B's requests | Log in as User A, attempt to fetch User B's request ID |
| User A cannot read User B's contacts | Same pattern |
| User A cannot read User B's AI conversations | Same pattern |
| Responder cannot access another's assignments | Log in as Responder A, fetch Responder B's assignment |
| Applicant cannot approve themselves | Submit an application with the same account that would approve it |
| Normal user cannot read audit_logs | Attempt `GET /audit_logs` via PostgREST anon/authenticated role |
| Only admins can approve applications | Attempt to call `approve_portal_application` as a non-admin |

## Secure RPC Functions

All admin RPC functions use `auth.uid()` internally — not a caller-supplied `p_admin_id`. This was fixed in migration `20260716000000_fix_audit_rpc_grants.sql`.

Functions to verify:
- `accept_emergency_request`
- `update_emergency_request_status`
- `cancel_emergency_request`
- `set_primary_emergency_contact`
- `approve_portal_application`
- `reject_portal_application`
- `suspend_user`
- `reactivate_user`
- `change_user_role`

## Realtime Publications

Verify these tables are in the `supabase_realtime` publication:

- `emergency_requests`
- `notifications`
- `request_messages`
- `responder_locations`

In the Supabase dashboard: Database → Replication → supabase_realtime → confirm table membership.

## Storage Buckets

Verify these buckets exist with correct access policies:

| Bucket | Access |
|---|---|
| `emergency-evidence` | Private — signed URLs only |
| `profile-avatars` | Public read, authenticated write |
| `application-documents` | Private — service-role or signed URLs only |
| `hospital-documents` | Private |

Full storage configuration is in `STORAGE.md`.

## Backups

Review the backup options on your Supabase plan:

- **Free tier**: daily backups, 7-day retention, no PITR
- **Pro tier**: daily backups, 7-day retention, PITR available as add-on
- **Team/Enterprise**: extended retention + PITR

Document the recovery procedure before going live. Never assume PITR is available without verifying it is enabled on the selected plan.
