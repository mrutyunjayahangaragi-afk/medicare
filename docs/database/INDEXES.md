# Index Strategy

## Design Principles

1. Index columns used in WHERE, ORDER BY, or JOIN ON clauses.
2. Composite indexes ordered by selectivity (most selective column first) and query order.
3. Partial indexes used where a subset of rows is always targeted (e.g., `WHERE status = 'pending'`).
4. Primary keys provide implicit B-tree indexes.
5. Unique constraints provide implicit unique indexes.

---

## Index Catalogue

### profiles

| Index Name | Columns | Type | Notes |
|---|---|---|---|
| `profiles_pkey` | `id` | Unique B-tree | PK |
| `profiles_role_idx` | `role` | B-tree | Role lookups in RPC guards |
| `profiles_availability_status_idx` | `availability_status` WHERE = 'available' | Partial | Available responder lookup |
| `profiles_organization_id_idx` | `organization_id` WHERE NOT NULL | Partial B-tree | Org member lookups |

### emergency_requests

| Index Name | Columns | Type | Notes |
|---|---|---|---|
| `emergency_requests_pkey` | `id` | Unique B-tree | PK |
| `idx_emergency_requests_user_created` | `(user_id, created_at DESC)` | B-tree | User history page, newest first |
| `idx_emergency_requests_status_created` | `(status, created_at DESC)` | B-tree | Dashboard: pending requests list |
| `idx_emergency_requests_responder_status` | `(assigned_responder_id, status, created_at DESC)` | B-tree | Responder's assigned requests |
| `idx_emergency_requests_severity_status` | `(severity, status, created_at DESC)` | B-tree | Triage prioritisation |

### emergency_contacts

| Index Name | Columns | Type | Notes |
|---|---|---|---|
| `emergency_contacts_pkey` | `id` | Unique B-tree | PK |
| `emergency_contacts_user_created_idx` | `(user_id, created_at DESC)` | B-tree | List contacts per user |
| `emergency_contacts_user_primary_idx` | `(user_id, is_primary)` | B-tree | Find primary contact quickly |
| `emergency_contacts_user_phone_unique_idx` | `(user_id, phone_number)` | Unique | Dedup phone per user |
| `emergency_contacts_one_primary_per_user_idx` | `(user_id)` WHERE `is_primary = true` | Partial Unique | Enforce single primary |

### notifications

| Index Name | Columns | Type | Notes |
|---|---|---|---|
| `notifications_pkey` | `id` | Unique B-tree | PK |
| `notifications_recipient_created_idx` | `(recipient_id, created_at DESC)` | B-tree | Notification list newest first |
| `notifications_unread_idx` | `(recipient_id, is_read, created_at DESC)` | B-tree | Unread badge count |
| `notifications_request_idx` | `(request_id, created_at DESC)` | B-tree | Notifications for a request |

### request_messages

| Index Name | Columns | Type | Notes |
|---|---|---|---|
| `request_messages_pkey` | `id` | Unique B-tree | PK |
| `request_messages_request_created_idx` | `(request_id, created_at ASC)` | B-tree | Load conversation thread in order |
| `request_messages_recipient_unread_idx` | `(recipient_id, is_read, created_at DESC)` | B-tree | Unread message count |
| `request_messages_sender_created_idx` | `(sender_id, created_at DESC)` | B-tree | Sender history |

### responder_locations

| Index Name | Columns | Type | Notes |
|---|---|---|---|
| `responder_locations_pkey` | `id` | Unique B-tree | PK |
| `unique_responder_request` | `(responder_id, request_id)` | Unique | One row per responder/request |
| `responder_locations_responder_id_idx` | `responder_id` | B-tree | Responder's current locations |
| `responder_locations_request_id_idx` | `request_id` | B-tree | All locations for a request |
| `responder_locations_responder_request_idx` | `(responder_id, request_id)` | B-tree | Composite lookup |
| `responder_locations_updated_at_idx` | `updated_at DESC` | B-tree | Stale location cleanup |

### organizations

| Index Name | Columns | Type | Notes |
|---|---|---|---|
| `organizations_pkey` | `id` | Unique B-tree | PK |
| `organizations_type_verified_idx` | `(organization_type, is_verified)` | B-tree | Filter by type + verified |
| `organizations_name_idx` | `name` | B-tree | Name search |

### organization_members

| Index Name | Columns | Type | Notes |
|---|---|---|---|
| `organization_members_pkey` | `id` | Unique B-tree | PK |
| `org_member_unique` | `(organization_id, user_id)` | Unique | Dedup membership |
| `org_members_user_status_idx` | `(user_id, status)` | B-tree | User's org memberships |
| `org_members_org_status_idx` | `(organization_id, status)` | B-tree | Org member list by status |

### audit_logs

| Index Name | Columns | Type | Notes |
|---|---|---|---|
| `audit_logs_pkey` | `id` | Unique B-tree | PK (bigint identity) |
| `audit_logs_actor_created_idx` | `(actor_id, created_at DESC)` | B-tree | Audit trail per user |
| `audit_logs_entity_idx` | `(entity_type, entity_id)` | B-tree | What happened to an entity |
| `audit_logs_created_idx` | `created_at DESC` | B-tree | Chronological audit feed |

---

## Important Query Plans

### User emergency history
```sql
SELECT * FROM emergency_requests
WHERE user_id = $1
ORDER BY created_at DESC
LIMIT 20;
-- Uses: idx_emergency_requests_user_created ✓
```

### Pending unassigned requests (responder dashboard)
```sql
SELECT * FROM emergency_requests
WHERE status = 'pending'
  AND assigned_responder_id IS NULL
ORDER BY created_at ASC;
-- Uses: idx_emergency_requests_status_created ✓
```

### Unread notification count
```sql
SELECT COUNT(*) FROM notifications
WHERE recipient_id = $1 AND is_read = false;
-- Uses: notifications_unread_idx ✓
```

### Conversation thread
```sql
SELECT * FROM request_messages
WHERE request_id = $1
ORDER BY created_at ASC;
-- Uses: request_messages_request_created_idx ✓
```

### Latest responder location
```sql
SELECT * FROM responder_locations
WHERE responder_id = $1 AND request_id = $2;
-- Uses: unique_responder_request (PK scan) ✓
```
