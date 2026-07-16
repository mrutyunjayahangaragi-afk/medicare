# Medicare Database Architecture

## Overview

Medicare uses Supabase PostgreSQL as its sole database. All tables live in the `public` schema.

## Technology Stack

| Component | Technology |
|---|---|
| Database | Supabase PostgreSQL 15 |
| Authentication | Supabase Auth (auth.users) |
| Storage | Supabase Storage |
| Realtime | Supabase Realtime (postgres_changes) |
| Migrations | SQL files in frontend/supabase/migrations/ |
| Backend ORM | None — direct Supabase client calls via repository layer |

## Conventions

- **Primary keys**: `uuid` with `gen_random_uuid()` default (except audit_logs: `bigint identity`)
- **Timestamps**: `timestamptz not null default now()`
- **Naming**: `snake_case` columns, plural table names
- **Triggers**: All `updated_at` columns use a single shared `set_updated_at()` function
- **RLS**: Enabled on every user-data table

## Tables Summary

| Table | Purpose | RLS | Realtime |
|---|---|---|---|
| profiles | User identity and medical info | ✅ | — |
| emergency_requests | Emergency request lifecycle | ✅ | ✅ |
| emergency_contacts | User's emergency contact list | ✅ | — |
| notifications | System and event notifications | ✅ | ✅ |
| notification_preferences | Per-user notification config | ✅ | — |
| user_settings | Per-user app settings | ✅ | — |
| request_messages | In-request chat | ✅ | ✅ |
| responder_locations | Live responder GPS (upsert) | ✅ | ✅ |
| organizations | Hospital/ambulance orgs | ✅ | — |
| organization_members | User ↔ org membership | ✅ | — |
| audit_logs | Immutable event log | ✅ (blocked) | — |
| account_deletion_requests | GDPR deletion flow | ✅ | — |

## Documentation Files

| File | Contents |
|---|---|
| ERD.md | Entity-relationship diagram (Mermaid) |
| TABLES.md | Per-table column reference |
| RLS.md | Row-Level Security policy catalogue |
| RPC.md | Secure function reference |
| INDEXES.md | Index strategy and query plans |
| REQUEST_STATE_MACHINE.md | Status transition rules |
| ROLLBACK.md | Rollback procedures and risk assessment |

## Migration History

| Timestamp | Description |
|---|---|
| 20260714194711 | Create emergency_requests |
| 20260714194712 | Create emergency-evidence storage bucket |
| 20260714210600 | Add responder assignment columns + RPC |
| 20260714220000 | Create responder_locations |
| 20260714230000 | Create notifications, request_messages, notification_preferences |
| 20260714231000 | Create emergency_contacts, user_settings; extend profiles |
| 20260715001000 | Enable RLS on profiles |
| 20260715120000 | Step 13 audit: fill gaps, add orgs/audit_logs, canonical triggers |
| 20260715130000 | Step 13 constraints and indexes |
| 20260715140000 | Step 13 additional RLS policies and RPCs |
