# Table Reference

## profiles

**Purpose**: Extends `auth.users` with user-facing profile data, role, and optional medical information.

| Column | Type | Nullable | Default | Constraints |
|---|---|---|---|---|
| id | uuid | NOT NULL | — | PK, FK → auth.users(id) ON DELETE CASCADE |
| full_name | text | YES | — | |
| email | text | YES | — | |
| phone | text | YES | — | |
| avatar_url | text | YES | — | |
| date_of_birth | date | YES | — | |
| gender | text | YES | — | CHECK IN (male, female, other, prefer_not_to_say) |
| address | text | YES | — | max 300 chars |
| blood_group | text | YES | — | CHECK IN (A+, A-, B+, ..., Unknown) |
| allergies | text | YES | — | max 500 chars |
| medical_conditions | text | YES | — | max 500 chars |
| current_medications | text | YES | — | max 500 chars |
| medical_notes | text | YES | — | max 1000 chars |
| role | text | NOT NULL | user | CHECK IN (user, responder, volunteer, hospital_staff, hospital, admin) |
| responder_type | text | YES | — | CHECK IN (ambulance, paramedic, doctor, nurse, ...) |
| availability_status | text | NOT NULL | offline | CHECK IN (available, busy, offline) |
| organization_id | uuid | YES | — | FK → organizations(id) |
| is_verified | boolean | NOT NULL | false | |
| hospital_name | text | YES | — | |
| created_at | timestamptz | NOT NULL | now() | |
| updated_at | timestamptz | NOT NULL | now() | Auto-updated by trigger |

**Triggers**: `profiles_updated_at`, `profiles_protect_auth_fields`, `on_auth_user_created` (on auth.users)  
**Sensitive fields**: allergies, medical_conditions, current_medications, medical_notes, date_of_birth  
**Protected fields (no user self-update)**: role, organization_id, responder_type, is_verified

---

## emergency_requests

**Purpose**: Core emergency request lifecycle from submission to completion.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| id | uuid | NOT NULL | gen_random_uuid() | PK |
| user_id | uuid | NOT NULL | — | FK → auth.users |
| emergency_type | enum | NOT NULL | — | medical/accident/fire/etc |
| severity | enum | NOT NULL | — | low/medium/high/critical |
| description | text | NOT NULL | — | 10–500 chars |
| latitude | double precision | YES | — | -90 to 90 |
| longitude | double precision | YES | — | -180 to 180 |
| location_accuracy | double precision | YES | — | |
| manual_address | text | YES | — | Required if no GPS |
| contact_number | text | NOT NULL | — | 7–20 chars, snapshot |
| evidence_path | text | YES | — | Storage path, private |
| status | enum | NOT NULL | pending | State machine enforced |
| assigned_responder_id | uuid | YES | — | FK → auth.users |
| assigned_at | timestamptz | YES | — | |
| accepted_at | timestamptz | YES | — | |
| in_progress_at | timestamptz | YES | — | |
| arrived_at | timestamptz | YES | — | Added Step 13 |
| completed_at | timestamptz | YES | — | |
| cancelled_at | timestamptz | YES | — | |
| created_at | timestamptz | NOT NULL | now() | |
| updated_at | timestamptz | NOT NULL | now() | |

**Intentional denormalization**: contact_number is a snapshot; manual_address is a snapshot.

---

## emergency_contacts

**Purpose**: User's emergency contact list for notification during emergencies.

Constraints: max one primary per user (partial unique index), unique phone per user.

---

## notifications

**Purpose**: System and event notifications for users.

**Column aliases**: `user_id` = `recipient_id` (synced by trigger); `data` = `metadata` (synced by trigger).  
**Note**: Direct INSERT is blocked by RLS — use `create_notification()` RPC.

---

## notification_preferences

**Purpose**: Per-user notification configuration. One row per user (primary key).

---

## user_settings

**Purpose**: Per-user application settings (privacy, location, appearance). One row per user.

Does not duplicate notification preferences.

---

## request_messages

**Purpose**: In-request chat between user and assigned responder.

**Constraints**: sender ≠ recipient; message 1–1000 chars.  
**Message types**: text, image, location, system.

---

## responder_locations

**Purpose**: Latest GPS position of each responder for each active request.

**Design decision**: One row per (responder_id, request_id) pair — not a history table.  
The unique constraint enforces this. The `upsert_responder_location()` RPC handles insert-or-update.

---

## organizations

**Purpose**: Hospitals, ambulance services, volunteer groups.  
Only verified organizations are accessible to the public via RLS.

---

## organization_members

**Purpose**: Many-to-many between users and organizations.  
New members start in `pending` status; must be approved by an admin.

---

## audit_logs

**Purpose**: Immutable event log for security-sensitive actions.

**Access**: Service-role (trusted backend) only. No RLS policies = no client access.  
**Do not record**: passwords, tokens, keys, complete medical records, message content.

---

## account_deletion_requests

**Purpose**: GDPR/user-requested account deletion flow.  
One active request per user (unique constraint). Processed by admin.
