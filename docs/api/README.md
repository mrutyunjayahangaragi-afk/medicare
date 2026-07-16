# Medicare API — Overview

## Base URL

```
http://localhost:8000
```

Production base URL is configured via `NEXT_PUBLIC_API_URL` on the frontend and the uvicorn host/port on the backend.

## API Version

All endpoints are versioned under `/api/v1`:

```
http://localhost:8000/api/v1/
```

## Interactive Documentation

| Interface | URL |
|---|---|
| Swagger UI | http://localhost:8000/docs |
| ReDoc | http://localhost:8000/redoc |
| OpenAPI JSON | http://localhost:8000/openapi.json |

Swagger UI supports Bearer token authentication — click **Authorize**, paste your Supabase access token.

## Modules

| Module | Prefix | Description |
|---|---|---|
| Health | `/api/v1/health` | Liveness and readiness |
| Auth | `/api/v1/auth` | Token verification, current user |
| Profile | `/api/v1/profile` | User profile CRUD |
| Emergency Requests | `/api/v1/emergency-requests` | Request lifecycle |
| Emergency Contacts | `/api/v1/emergency-contacts` | Contact management |
| Notifications | `/api/v1/notifications` | Notification inbox |
| Messages | `/api/v1/messages` | In-request messaging |
| Responder | `/api/v1/responder` | Responder-only operations |
| Organizations | `/api/v1/organizations` | Organization directory |

## Related Documents

- [AUTHENTICATION.md](./AUTHENTICATION.md)
- [ENDPOINTS.md](./ENDPOINTS.md)
- [ERRORS.md](./ERRORS.md)
- [FRONTEND_INTEGRATION.md](./FRONTEND_INTEGRATION.md)
- [SECURITY.md](./SECURITY.md)
