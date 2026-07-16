# Post-Deployment Testing

## Smoke Test — End-to-End Flow

Use synthetic test accounts only. Never use real emergency submissions.

### Step 1 — Infrastructure

| Check | Command / URL | Expected |
|---|---|---|
| Backend root | `GET https://BACKEND/` | `200 {"message": "Welcome to Medicare API", ...}` |
| Backend health | `GET https://BACKEND/api/v1/health` | `200 {"status":"healthy","environment":"production"}` |
| Frontend landing | `https://FRONTEND/` | 200, page renders, no console errors |
| No localhost in requests | Browser DevTools → Network | Zero requests to `http://localhost` |
| No mixed content | Browser console | Zero mixed-content warnings |

### Step 2 — Authentication

| Test | Expected |
|---|---|
| Google OAuth login (user account) | Redirect to `/dashboard` |
| OTP login (email user) | Redirect to `/dashboard` |
| Forgot password email | Email arrives, link redirects to `/auth/update-password` on production domain |
| Logout | Session cleared, redirect to `/login` |
| Access `/dashboard` without auth | Redirect to `/login` |
| Access `/admin` without auth | Redirect to `/admin/login` |

### Step 3 — User Portal

| Test | Expected |
|---|---|
| View dashboard | Stats display (or show zero state gracefully) |
| Add emergency contact | Contact appears in list |
| Submit SOS request (test description: "This is a test emergency submission") | Request created, appears in My Requests |
| View My Requests | Request list loads, status shown |
| View request detail | Full detail page loads |
| Cancel pending request | Status changes to cancelled |
| View nearby services | Map loads, services listed (or graceful empty state) |
| Open AI assistant | Chat interface loads |
| Send AI message | Response received within timeout |

### Step 4 — Responder Portal

| Test | Expected |
|---|---|
| Responder login (approved account) | Redirect to `/responder` |
| View available requests | List loads |
| Accept a test request | Status updates for both responder and user |
| Start location sharing | Location data transmitted |
| User receives responder location | Map updates in user view |
| Send message to user | Message appears in both portals |
| Complete request | Status transitions correctly |

### Step 5 — Hospital Portal

| Test | Expected |
|---|---|
| Hospital login (approved account) | Redirect to `/hospital` |
| View dashboard | Stats load |
| View incoming requests | Request list loads |

### Step 6 — Admin Portal

| Test | Expected |
|---|---|
| Admin login | Redirect to `/admin/dashboard` |
| View pending applications | Application list loads |
| Approve hospital application | Role updates, org created, audit log entry |
| Reject responder application | Status set to rejected, notification sent |
| View audit logs | Log entries appear |
| Suspend a test user | User status changes |
| Reactivate the test user | Status restored |

### Step 7 — Security Spot-Checks

| Check | Expected |
|---|---|
| `Authorization` header not visible in client-side JS | Confirmed — set by fetch only |
| Supabase service role key | Not present anywhere in browser requests |
| Gemini API key | Not present in browser network requests |
| Geoapify key | Not present in browser network requests |
| `/api/v1/admin/applications` without admin token | `401` |
| User A fetches User B's request ID directly | `404` (RLS blocks it) |
| Storage: fetch private evidence URL without auth | `400` or `401` |
| Expired signed URL | `400` or `401` |

---

## Known Acceptable Degraded States

| Feature | Degraded behavior | Acceptable? |
|---|---|---|
| ML severity prediction | Returns `503 {"message":"Model unavailable"}` if artifacts missing | Yes — SOS form continues to work |
| AI assistant | Returns safe error message if Gemini quota exceeded | Yes |
| Nearby services | Returns empty list if Geoapify quota exceeded | Yes |
| Recommendations | Returns `recommendation_available: false` | Yes |

---

## After Smoke Test

Record results in `FINAL_REPORT.md` (see main deployment checklist).

If any critical path fails (SOS submission, auth, My Requests, dashboard), do not declare deployment complete. Follow the rollback procedure in `ROLLBACK.md`.
