# Frontend Integration

## API Client

The shared authenticated fetch helper is at `frontend/lib/api/client.ts`.

### Usage

```typescript
import { apiFetch, getAuthMe, getMyProfile, getMyEmergencyRequests } from "@/lib/api/client";

// Verify FastAPI auth is working
const me = await getAuthMe();
console.log(me.data?.id, me.data?.role);

// Fetch own profile
const profile = await getMyProfile();

// List emergency requests (paginated)
const requests = await getMyEmergencyRequests({ page: 1, page_size: 20 });
console.log(requests.data?.items);

// Custom authenticated request
const result = await apiFetch<MyType>("/api/v1/some-endpoint", {
  method: "POST",
  body: JSON.stringify({ field: "value" }),
});
```

### Error Handling

```typescript
import { ApiError } from "@/lib/api/client";

try {
  const data = await apiFetch("/api/v1/profile");
} catch (err) {
  if (err instanceof ApiError) {
    if (err.status === 401) { /* redirect to login */ }
    if (err.status === 404) { /* handle not found */ }
    console.error(err.message); // Server's safe error message
  }
}
```

## Flows Connected to FastAPI (Step 14)

| Flow | FastAPI Endpoint | Notes |
|---|---|---|
| Auth verification | `GET /api/v1/auth/me` | Confirms token is valid |
| Own profile | `GET /api/v1/profile` | Safe to replace Supabase direct query |
| Emergency request history | `GET /api/v1/emergency-requests` | Paginated list |

## Flows Still Using Supabase Directly

These flows continue to use the Supabase JS client directly in the frontend. They are not broken or migrated in Step 14:

| Flow | Reason |
|---|---|
| Emergency request creation | Evidence upload to Supabase Storage must happen first; the storage path is then sent to FastAPI |
| Avatar upload | Large file upload goes to Supabase Storage directly |
| Realtime subscriptions | Handled by Supabase Realtime (Step 15) |
| Nearby hospitals/pharmacies | External OSM/Google API, not FastAPI |
| Authentication (login/OAuth) | Managed entirely by Supabase Auth |

## Environment Variables

```
# frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## How the Token Flows

1. User logs in via Supabase Auth (frontend).
2. Frontend receives `session.access_token`.
3. `apiFetch` reads the token from `supabase.auth.getSession()` on every request.
4. Token is sent as `Authorization: Bearer <token>`.
5. FastAPI validates it server-side and identifies the user.
6. The validated `user_id` is used for all queries — never the client's claim.

## Notes

- `Content-Type: application/json` is set automatically for JSON requests.
- For `FormData` uploads, do **not** set `Content-Type` — let the browser handle the multipart boundary.
- The client never logs the access token.
- `ApiError` preserves the server's safe error message for UI display.
