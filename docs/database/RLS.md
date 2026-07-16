# Row-Level Security Policies

RLS is enabled on all user-data tables in the `public` schema.

## profiles

| Policy | Operation | Condition |
|---|---|---|
| Users can view their own profile | SELECT | `auth.uid() = id` |
| Users can insert their own profile | INSERT | `auth.uid() = id` |
| Users can update their own profile | UPDATE | `auth.uid() = id` (trigger blocks role/org changes) |

**Note**: The `protect_profile_auth_fields` trigger prevents users from self-escalating role, organization_id, responder_type, or is_verified even through the allowed UPDATE path.

## emergency_requests

| Policy | Operation | Condition |
|---|---|---|
| Users can insert own emergency requests | INSERT | `auth.uid() = user_id` |
| Users can select own emergency requests | SELECT | `auth.uid() = user_id` |
| Responders can view available and assigned requests | SELECT | `status = 'pending' AND assigned_responder_id IS NULL` OR `assigned_responder_id = auth.uid()` |

**No direct UPDATE policy for users** — status changes must go through RPC functions.

## emergency_contacts

| Policy | Operation | Condition |
|---|---|---|
| View own | SELECT | `user_id = auth.uid()` |
| Insert own | INSERT | `user_id = auth.uid()` |
| Update own | UPDATE | `user_id = auth.uid()` |
| Delete own | DELETE | `user_id = auth.uid()` |

## notifications

| Policy | Operation | Condition |
|---|---|---|
| View own | SELECT | `recipient_id = auth.uid() OR user_id = auth.uid()` |
| Update own (mark read) | UPDATE | `recipient_id = auth.uid() OR user_id = auth.uid()` |
| Block direct inserts | INSERT | `false` — must use create_notification() RPC |
| Block deletes | DELETE | `false` |

## notification_preferences

| Policy | Operation | Condition |
|---|---|---|
| View own | SELECT | `user_id = auth.uid()` |
| Insert own | INSERT | `user_id = auth.uid()` |
| Update own | UPDATE | `user_id = auth.uid()` |

## user_settings

| Policy | Operation | Condition |
|---|---|---|
| View own | SELECT | `user_id = auth.uid()` |
| Insert own | INSERT | `user_id = auth.uid()` |
| Update own | UPDATE | `user_id = auth.uid()` |

## request_messages

| Policy | Operation | Condition |
|---|---|---|
| View own messages | SELECT | Caller is request owner OR assigned responder |
| Insert messages | INSERT | `sender_id = auth.uid()` AND caller is participant |
| Update read state | UPDATE | `recipient_id = auth.uid()` |
| Block deletes | DELETE | `false` |

## responder_locations

| Policy | Operation | Condition |
|---|---|---|
| Responders insert own | INSERT | `auth.uid() = responder_id` |
| Responders update own | UPDATE | `auth.uid() = responder_id` |
| Request owner can view | SELECT | User owns the linked emergency_request |
| Assigned responder can view | SELECT | `assigned_responder_id = auth.uid()` on the request |

## organizations

| Policy | Operation | Condition |
|---|---|---|
| Public view verified | SELECT | `is_verified = true` |

## organization_members

| Policy | Operation | Condition |
|---|---|---|
| View own membership | SELECT | `user_id = auth.uid()` |

## audit_logs

**No policies** — effectively blocks all authenticated and anon access.  
Only service_role (trusted backend) can read or write audit logs.

## account_deletion_requests

| Policy | Operation | Condition |
|---|---|---|
| View own | SELECT | `user_id = auth.uid()` |
| Insert own | INSERT | `user_id = auth.uid()` |
