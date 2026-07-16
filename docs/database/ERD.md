# Medicare — Entity Relationship Diagram

```mermaid
erDiagram
    AUTH_USERS {
        uuid id PK
        text email
        jsonb raw_user_meta_data
        timestamptz created_at
    }

    PROFILES {
        uuid id PK_FK
        text full_name
        text email
        text phone
        text avatar_url
        date date_of_birth
        text gender
        text address
        text blood_group
        text allergies
        text medical_conditions
        text current_medications
        text medical_notes
        text role
        text responder_type
        text availability_status
        uuid organization_id FK
        boolean is_verified
        timestamptz created_at
        timestamptz updated_at
    }

    EMERGENCY_REQUESTS {
        uuid id PK
        uuid user_id FK
        text emergency_type
        text severity
        text description
        float latitude
        float longitude
        float location_accuracy
        text manual_address
        text contact_number
        text evidence_path
        text status
        uuid assigned_responder_id FK
        timestamptz assigned_at
        timestamptz accepted_at
        timestamptz in_progress_at
        timestamptz arrived_at
        timestamptz completed_at
        timestamptz cancelled_at
        timestamptz created_at
        timestamptz updated_at
    }

    EMERGENCY_CONTACTS {
        uuid id PK
        uuid user_id FK
        text full_name
        text relationship
        text phone_number
        text alternate_phone
        text email
        boolean is_primary
        boolean notify_during_emergency
        text notes
        timestamptz created_at
        timestamptz updated_at
    }

    NOTIFICATIONS {
        uuid id PK
        uuid recipient_id FK
        uuid user_id FK
        uuid request_id FK
        uuid actor_id FK
        text type
        text title
        text message
        jsonb metadata
        jsonb data
        boolean is_read
        timestamptz read_at
        timestamptz created_at
        timestamptz updated_at
    }

    NOTIFICATION_PREFERENCES {
        uuid user_id PK_FK
        boolean emergency_updates
        boolean responder_arrival
        boolean new_messages
        boolean request_completion
        boolean browser_notifications
        boolean sound_enabled
        timestamptz updated_at
    }

    USER_SETTINGS {
        uuid user_id PK_FK
        boolean share_medical_details
        boolean share_phone_with_responder
        boolean allow_location_sharing
        boolean notify_emergency_contacts
        boolean use_high_accuracy_location
        boolean remember_manual_address
        text theme
        timestamptz updated_at
    }

    REQUEST_MESSAGES {
        uuid id PK
        uuid request_id FK
        uuid sender_id FK
        uuid recipient_id FK
        text message
        text message_type
        text attachment_path
        boolean is_read
        timestamptz read_at
        timestamptz created_at
        timestamptz edited_at
        timestamptz updated_at
    }

    RESPONDER_LOCATIONS {
        uuid id PK
        uuid responder_id FK
        uuid request_id FK
        numeric latitude
        numeric longitude
        numeric heading
        numeric speed
        numeric accuracy
        timestamptz created_at
        timestamptz updated_at
    }

    ORGANIZATIONS {
        uuid id PK
        text name
        text organization_type
        text phone
        text email
        text address
        float latitude
        float longitude
        boolean is_verified
        timestamptz created_at
        timestamptz updated_at
    }

    ORGANIZATION_MEMBERS {
        uuid id PK
        uuid organization_id FK
        uuid user_id FK
        text member_role
        text status
        timestamptz created_at
        timestamptz updated_at
    }

    AUDIT_LOGS {
        bigint id PK
        uuid actor_id FK
        text action
        text entity_type
        text entity_id
        jsonb old_data
        jsonb new_data
        inet ip_address
        text user_agent
        timestamptz created_at
    }

    ACCOUNT_DELETION_REQUESTS {
        uuid id PK
        uuid user_id FK
        text reason
        text status
        timestamptz requested_at
        timestamptz processed_at
        uuid processed_by FK
    }

    %% Relationships
    AUTH_USERS ||--|| PROFILES : "has (trigger auto-creates)"
    AUTH_USERS ||--o{ EMERGENCY_REQUESTS : "creates"
    AUTH_USERS ||--o{ EMERGENCY_CONTACTS : "owns"
    AUTH_USERS ||--o{ NOTIFICATIONS : "receives"
    AUTH_USERS ||--o| NOTIFICATION_PREFERENCES : "has"
    AUTH_USERS ||--o| USER_SETTINGS : "has"
    AUTH_USERS ||--o{ ORGANIZATION_MEMBERS : "joins"
    AUTH_USERS ||--o| ACCOUNT_DELETION_REQUESTS : "may request"
    AUTH_USERS ||--o{ AUDIT_LOGS : "actor in"

    EMERGENCY_REQUESTS ||--o{ REQUEST_MESSAGES : "contains"
    EMERGENCY_REQUESTS ||--o| RESPONDER_LOCATIONS : "tracks (latest)"
    EMERGENCY_REQUESTS ||--o{ NOTIFICATIONS : "referenced by"
    EMERGENCY_REQUESTS }o--o| PROFILES : "assigned_responder"

    ORGANIZATIONS ||--o{ ORGANIZATION_MEMBERS : "has"
    ORGANIZATIONS }o--o| PROFILES : "organization_id on profile"
```

## Key Relationships

| Relationship | Cardinality | Notes |
|---|---|---|
| auth.users → profiles | 1:1 | Trigger auto-creates on signup |
| auth.users → emergency_requests | 1:N | user_id FK |
| auth.users → emergency_contacts | 1:N | Per-user contact list |
| auth.users → notifications | 1:N | recipient_id / user_id |
| auth.users → notification_preferences | 1:1 | One row per user |
| auth.users → user_settings | 1:1 | One row per user |
| emergency_requests → request_messages | 1:N | Conversation thread |
| emergency_requests → responder_locations | 1:0..1 | Latest location only (unique constraint) |
| organizations → organization_members | 1:N | Many users per org |
| auth.users → organization_members | N:M through org_members | |

## Intentional Denormalization

| Field | Table | Reason |
|---|---|---|
| contact_number | emergency_requests | Snapshot at request time — responder must always have the number even if user later changes phone |
| manual_address | emergency_requests | Snapshot — location should not change after submission |
