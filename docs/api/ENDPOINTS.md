# API Endpoints Reference

All endpoints require `Authorization: Bearer <token>` unless marked **public**.

---

## Health

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/v1/health` | public | Liveness check |

---

## Authentication

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/v1/auth/me` | required | Current user identity + profile summary |

---

## Profile

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/v1/profile` | required | Get own profile |
| PUT | `/api/v1/profile` | required | Replace all editable fields |
| PATCH | `/api/v1/profile` | required | Partial update |

**Editable fields:** `full_name`, `phone`, `avatar_url`, `date_of_birth`, `gender`, `address`, `blood_group`, `allergies`, `medical_conditions`, `current_medications`, `medical_notes`, `hospital_name`

**Protected (never writable):** `role`, `organization_id`, `responder_type`, `is_verified`

---

## Emergency Requests

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/v1/emergency-requests` | required | Create request |
| GET | `/api/v1/emergency-requests` | required | List own requests (paginated) |
| GET | `/api/v1/emergency-requests/{id}` | required | Get single own request |
| POST | `/api/v1/emergency-requests/{id}/cancel` | required | Cancel via RPC |

**Query filters (GET list):** `status`, `severity`, `emergency_type`, `search`, `page`, `page_size`

---

## Emergency Contacts

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/v1/emergency-contacts` | required | List own contacts |
| POST | `/api/v1/emergency-contacts` | required | Create contact |
| GET | `/api/v1/emergency-contacts/{id}` | required | Get one |
| PUT | `/api/v1/emergency-contacts/{id}` | required | Full update |
| PATCH | `/api/v1/emergency-contacts/{id}` | required | Partial update |
| DELETE | `/api/v1/emergency-contacts/{id}` | required | Delete |
| POST | `/api/v1/emergency-contacts/{id}/primary` | required | Set as primary (RPC) |

---

## Notifications

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/v1/notifications` | required | List own (paginated) |
| GET | `/api/v1/notifications/unread-count` | required | Unread count (RPC) |
| POST | `/api/v1/notifications/{id}/read` | required | Mark one read (RPC) |
| POST | `/api/v1/notifications/read-all` | required | Mark all read (RPC) |

**Query filters:** `is_read`, `type`, `page`, `page_size`

---

## Messages

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/v1/messages/conversations` | required | Conversation summaries |
| GET | `/api/v1/messages/{request_id}` | required | Get conversation (RPC) |
| POST | `/api/v1/messages/{request_id}` | required | Send message (RPC) |
| POST | `/api/v1/messages/{request_id}/read` | required | Mark as read (RPC) |

---

## Responder *(requires responder role)*

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/v1/responder/requests/available` | responder | Pending unassigned requests |
| GET | `/api/v1/responder/requests/assigned` | responder | My assigned requests |
| GET | `/api/v1/responder/requests/{id}` | responder | Single request |
| POST | `/api/v1/responder/requests/{id}/accept` | responder | Accept (RPC) |
| POST | `/api/v1/responder/requests/{id}/start` | responder | → in_progress (RPC) |
| POST | `/api/v1/responder/requests/{id}/arrive` | responder | → arrived (RPC) |
| POST | `/api/v1/responder/requests/{id}/complete` | responder | → completed (RPC) |
| PUT | `/api/v1/responder/availability` | responder | Update availability |
| PUT | `/api/v1/responder/location/{id}` | responder | Update GPS location |
| GET | `/api/v1/responder/location/{id}` | any user | Get latest location |

---

## Organizations

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/v1/organizations` | required | List verified organizations |
| GET | `/api/v1/organizations/me` | required | My organization |
| GET | `/api/v1/organizations/{id}` | required | Single verified org |
| GET | `/api/v1/organizations/{id}/members` | owner/manager | List members |
| POST | `/api/v1/organizations/{id}/members` | owner/manager | Add member |
| PATCH | `/api/v1/organizations/{id}/members/{mid}` | owner/manager | Update member |

---

## Pagination

Default query parameters for all list endpoints:

| Parameter | Default | Maximum | Description |
|---|---|---|---|
| `page` | 1 | — | Page number (1-based) |
| `page_size` | 20 | 100 | Items per page |

Response shape:

```json
{
  "items": [],
  "page": 1,
  "page_size": 20,
  "total": 0,
  "has_next": false
}
```
