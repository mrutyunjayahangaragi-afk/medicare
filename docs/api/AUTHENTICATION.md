# Authentication

## Overview

The Medicare FastAPI backend uses **Supabase Auth** for authentication. Authentication is managed entirely by Supabase — the FastAPI backend validates tokens but does not issue them.

## Flow

```
Frontend                    Supabase Auth              FastAPI Backend
   │                              │                          │
   ├──── Login / OAuth ──────────►│                          │
   │◄─── access_token ────────────┤                          │
   │                              │                          │
   ├──── GET /api/v1/auth/me ──────────────────────────────►│
   │     Authorization: Bearer <access_token>                │
   │                              │                          │
   │                              │◄── admin.auth.getUser() ─┤
   │                              ├─── user object ─────────►│
   │◄──────────────── { id, email, role } ───────────────────┤
```

## Header Format

Every authenticated request must include:

```
Authorization: Bearer <supabase-access-token>
```

## Getting a Token (Frontend)

```typescript
const { data: { session } } = await supabase.auth.getSession();
const token = session?.access_token;
```

## Token Validation

The backend validates tokens by calling `supabase.auth.get_user(token)` using the admin client. This makes a server-side request to Supabase Auth to cryptographically verify the JWT — the token is never decoded locally without signature verification.

## What is Never Returned

- Access tokens
- Refresh tokens
- Service-role keys
- Raw Supabase metadata (`identities`, `raw_user_meta_data`)
- Password hashes

## GET /api/v1/auth/me

Returns safe user identity:

```json
{
  "success": true,
  "message": "Authenticated user retrieved successfully.",
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "user",
    "full_name": "Jane Doe",
    "avatar_url": null
  }
}
```

## Error Responses

| Condition | Status | Message |
|---|---|---|
| No Authorization header | 401 | Authentication required |
| Invalid or expired token | 401 | Authentication token is invalid or expired |
| Non-Bearer scheme | 401 | Authentication required |
