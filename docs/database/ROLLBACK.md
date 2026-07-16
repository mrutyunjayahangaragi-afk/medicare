# Database Rollback Notes

> **WARNING**: Never execute rollback scripts against production without a verified backup.

## Step 13 Migration Summary

Three migrations were added in Step 13:

| File | Reversible | Risk |
|---|---|---|
| 20260715120000_database_architecture_audit.sql | Mostly yes | Medium |
| 20260715130000_database_constraints_indexes.sql | Yes | Low |
| 20260715140000_database_rls_rpc.sql | Yes | Low |

---

## Reversible Changes (can be rolled back without data loss)

### Indexes
All `CREATE INDEX IF NOT EXISTS` commands can be reversed with:
```sql
DROP INDEX IF EXISTS <index_name>;
```
No data loss. Indexes are rebuild-able at any time.

### New Tables (if empty)
```sql
-- Only safe if tables contain NO production data
DROP TABLE IF EXISTS public.account_deletion_requests;
DROP TABLE IF EXISTS public.organization_members;
DROP TABLE IF EXISTS public.organizations;
DROP TABLE IF EXISTS public.audit_logs;
```
> Verify row count before dropping: `SELECT COUNT(*) FROM public.audit_logs;`

### Triggers
```sql
DROP TRIGGER IF EXISTS profiles_updated_at          ON public.profiles;
DROP TRIGGER IF EXISTS profiles_protect_auth_fields  ON public.profiles;
DROP TRIGGER IF EXISTS organizations_updated_at      ON public.organizations;
DROP TRIGGER IF EXISTS organization_members_updated_at ON public.organization_members;
DROP TRIGGER IF EXISTS notifications_updated_at      ON public.notifications;
DROP TRIGGER IF EXISTS notifications_sync_aliases    ON public.notifications;
DROP TRIGGER IF EXISTS request_messages_updated_at   ON public.request_messages;
DROP TRIGGER IF EXISTS user_settings_updated_at      ON public.user_settings;
DROP TRIGGER IF EXISTS emergency_contacts_updated_at ON public.emergency_contacts;
DROP TRIGGER IF EXISTS notification_preferences_updated_at ON public.notification_preferences;
DROP TRIGGER IF EXISTS responder_locations_updated_at ON public.responder_locations;
DROP TRIGGER IF EXISTS on_auth_user_created          ON auth.users;
```

### RLS Policies
```sql
DROP POLICY IF EXISTS "Public can view verified organizations" ON public.organizations;
DROP POLICY IF EXISTS "Users can view their own memberships"   ON public.organization_members;
DROP POLICY IF EXISTS "Users can view own deletion request"   ON public.account_deletion_requests;
DROP POLICY IF EXISTS "Users can insert own deletion request" ON public.account_deletion_requests;
```

### RPC Functions
```sql
DROP FUNCTION IF EXISTS public.cancel_emergency_request(uuid);
DROP FUNCTION IF EXISTS public.get_my_profile();
DROP FUNCTION IF EXISTS public.get_my_emergency_requests();
DROP FUNCTION IF EXISTS public.get_request_conversation(uuid);
DROP FUNCTION IF EXISTS public.write_audit_log(uuid, text, text, text, jsonb, jsonb, inet, text);
DROP FUNCTION IF EXISTS public.upsert_profile_on_signup(uuid, text, text, text);
DROP FUNCTION IF EXISTS public.protect_profile_auth_fields();
DROP FUNCTION IF EXISTS public.sync_notification_user_id();
DROP FUNCTION IF EXISTS public.handle_new_user();
```

---

## Irreversible Changes (data may be lost)

### New Columns on Existing Tables
These columns can technically be dropped with `ALTER TABLE ... DROP COLUMN`, but **any data written to them will be lost**:

| Table | Column | Rollback Command |
|---|---|---|
| profiles | organization_id | `ALTER TABLE public.profiles DROP COLUMN IF EXISTS organization_id;` |
| emergency_requests | arrived_at | `ALTER TABLE public.emergency_requests DROP COLUMN IF EXISTS arrived_at;` |
| notifications | user_id | `ALTER TABLE public.notifications DROP COLUMN IF EXISTS user_id;` — **data loss** |
| notifications | data | `ALTER TABLE public.notifications DROP COLUMN IF EXISTS data;` — **data loss** |
| notifications | updated_at | `ALTER TABLE public.notifications DROP COLUMN IF EXISTS updated_at;` |
| request_messages | updated_at | `ALTER TABLE public.request_messages DROP COLUMN IF EXISTS updated_at;` |
| user_settings | use_high_accuracy_location | `ALTER TABLE public.user_settings DROP COLUMN IF EXISTS use_high_accuracy_location;` |
| user_settings | remember_manual_address | `ALTER TABLE public.user_settings DROP COLUMN IF EXISTS remember_manual_address;` |

### Constraints
Constraints can be dropped without data loss but their removal weakens data integrity:
```sql
ALTER TABLE public.emergency_requests DROP CONSTRAINT IF EXISTS emergency_requests_lat_range;
ALTER TABLE public.emergency_requests DROP CONSTRAINT IF EXISTS emergency_requests_lng_range;
ALTER TABLE public.emergency_requests DROP CONSTRAINT IF EXISTS emergency_requests_contact_length;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
```

---

## Backup Recommendation

Before applying any Step 13 migrations to production:
1. Take a full Supabase database backup from the Dashboard → Settings → Database → Backups.
2. Verify the backup restores successfully in a staging environment.
3. Apply migrations to staging first and test all user flows.
4. Apply to production only after staging validation passes.

---

## Partial Rollback Procedure

If a migration partially fails:
1. Check `supabase migration list` for applied status.
2. Do NOT run a full `supabase db reset` — this deletes all data.
3. Manually undo specific statements using the commands above.
4. Re-run only the failed portion after fixing the root cause.
