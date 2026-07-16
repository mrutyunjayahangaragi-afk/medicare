# Security Model

## Authentication

- All protected endpoints require `Authorization: Bearer <supabase-access-token>`.
- Tokens are validated server-side by calling `supabase.auth.get_user(token)` — not decoded locally.
- The service-role key is never used to identify a normal user.
- Expired or invalid tokens return HTTP 401.

## Authorization — Never Trust the Client

| Principle | Implementation |
|---|---|
| Never trust client user_id | `user_id` is always set from `current_user.id` (token) |
| Never trust client role | Role is read from the database profile row |
| Never trust request body for ownership | All queries include `user_id = current_user.id` filter |

## Row-Level Security (RLS)

- All user-scoped operations use a Supabase client with the user JWT attached via `postgrest.auth(access_token)`.
- This passes the JWT to PostgREST so `auth.uid()` evaluates correctly in RLS policies.
- The admin (service-role) client is reserved for operations that genuinely require bypassing RLS (e.g., reading audit logs, cross-user queries the backend orchestrates).

## Protected State Transitions (RPC)

The following operations use secure `SECURITY DEFINER` database functions, not direct table updates:

| Operation | RPC Function |
|---|---|
| Accept emergency request | `accept_emergency_request` |
| Update request status | `update_emergency_request_status` |
| Cancel request | `cancel_emergency_request` |
| Set primary contact | `set_primary_emergency_contact` |
| Send message | `send_request_message` |
| Mark messages read | `mark_request_messages_read` |
| Mark notification read | `mark_notification_read` |
| Mark all notifications read | `mark_all_notifications_read` |
| Get unread count | `get_unread_notification_count` |
| Update availability | `update_responder_availability` |
| Upsert location | `upsert_responder_location` |

## Role Enforcement

- `require_responder`: reads the `role` field from the database profile. Accepted roles: `responder`, `volunteer`, `hospital_staff`, `hospital`.
- `require_admin`: reads the `role` field from the database profile. Role must be `admin`.
- Users cannot self-escalate — the `protect_profile_auth_fields` database trigger reverts role/org/is_verified changes attempted through normal UPDATE paths.

## What is Never Exposed in Responses

- Access tokens or refresh tokens
- Service-role keys or anon keys
- Raw Supabase metadata
- SQL error messages
- Stack traces
- Internal table names
- Private storage paths (evidence_path is excluded from EmergencyRequestResponse)
- Other users' data (404 is returned instead of 403 for cross-user access)

## CORS

- Origin allow-list only — `allow_origins=["*"]` is never used.
- Configured via `BACKEND_CORS_ORIGINS` environment variable.
- Frontend must send the Authorization header explicitly.

## Rate Limiting (Production Requirement)

Basic rate limiting is **not implemented** in Step 14. The following endpoints will require rate limiting before production deployment:

- `POST /api/v1/emergency-requests`
- `POST /api/v1/messages/{request_id}`
- `PUT /api/v1/responder/location/{request_id}`
- `PUT /api/v1/profile`
- `POST /api/v1/notifications/{id}/read`

## Logging — Never Logged

- Access tokens
- Refresh tokens
- Medical descriptions or notes
- Exact emergency coordinates
- Message content
- Service-role keys
