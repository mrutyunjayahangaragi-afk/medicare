# Secure RPC Functions

All functions use `SECURITY DEFINER SET search_path = public` unless stated otherwise.  
Caller identity is always verified via `auth.uid()`.

## Core RPCs

### accept_emergency_request(request_id uuid)
- **Caller**: Responder (role: volunteer, hospital, responder)
- **Effect**: Atomically assigns the responder and sets status to `accepted`
- **Guards**: Caller must be `available`; request must be `pending` and unassigned; row-level lock prevents double-accept
- **Returns**: `emergency_requests` row

### update_emergency_request_status(request_id uuid, next_status text)
- **Caller**: Assigned responder
- **Effect**: Validates and applies a status transition; sets matching timestamp column
- **State machine**: See REQUEST_STATE_MACHINE.md
- **Returns**: `emergency_requests` row

### cancel_emergency_request(p_request_id uuid)
- **Caller**: Request owner (user)
- **Effect**: Cancels a `pending` or `accepted` request
- **Guards**: Verifies caller is the request owner
- **Returns**: `jsonb { success, request_id }`

### update_responder_availability(new_status text)
- **Caller**: Responder
- **Effect**: Sets `availability_status` on the caller's profile
- **Returns**: `boolean`

## Profile RPCs

### get_my_profile()
- **Caller**: Any authenticated user
- **Effect**: Returns the caller's profile, stripping internal fields
- **Returns**: `jsonb`

### upsert_profile_on_signup(user_id, full_name, email, avatar_url)
- **Caller**: Service-role backend ONLY
- **Effect**: Creates or soft-updates a profile row
- **Returns**: `void`

## Location RPCs

### upsert_responder_location(p_request_id, p_latitude, p_longitude, ...)
- **Caller**: Assigned responder
- **Effect**: Upserts the single latest-location row for responder+request
- **Returns**: `jsonb`

## Message RPCs

### send_request_message(p_request_id uuid, p_message_text text)
- **Caller**: Request participant (owner or assigned responder)
- **Effect**: Inserts message and creates a notification for the recipient
- **Returns**: `jsonb { success, message_id, notification_id }`

### mark_request_messages_read(p_request_id uuid)
- **Caller**: Request participant
- **Effect**: Marks all messages addressed to the caller as read
- **Returns**: `jsonb { success }`

## Notification RPCs

### create_notification(...)
- **Caller**: Any authenticated user (but direct inserts are blocked via RLS)
- **Effect**: Inserts a notification row bypassing the INSERT=false policy
- **Returns**: `uuid`

### mark_notification_read(p_notification_id uuid)
- **Caller**: Notification recipient
- **Returns**: `jsonb { success }`

### mark_all_notifications_read()
- **Caller**: Any authenticated user
- **Returns**: `jsonb { success }`

### get_unread_notification_count()
- **Caller**: Any authenticated user
- **Returns**: `integer`

## Contact RPCs

### set_primary_emergency_contact(p_contact_id uuid)
- **Caller**: Contact owner
- **Effect**: Atomically sets one contact as primary, clears others
- **Returns**: `jsonb { success, contact_id }`

## Query RPCs

### get_my_emergency_requests()
- **Returns**: `jsonb` array of the caller's requests, newest first

### get_request_conversation(p_request_id uuid)
- **Caller**: Request participant (owner or assigned responder)
- **Returns**: `jsonb { request_id, messages[] }`

## Audit RPCs

### write_audit_log(...)
- **Caller**: Service-role ONLY (all other roles have EXECUTE revoked)
- **Effect**: Inserts an immutable audit log row
- **Returns**: `bigint` (audit log ID)

## Helper Functions

### is_responder()
- **Returns**: `boolean` — true if caller has volunteer/hospital role

### set_updated_at() [trigger function]
- Used by all updated_at triggers

### handle_new_user() [trigger function]
- Fires on `auth.users INSERT` — creates profile row

### protect_profile_auth_fields() [trigger function]
- Fires on `profiles UPDATE` — reverts role/org/is_verified changes by normal users
