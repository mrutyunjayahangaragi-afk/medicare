# RLS Security Audit Report

## Table Audit Results

All PostgreSQL tables in the `public` schema have Row-Level Security (RLS) enabled.

| Table | RLS Status | Read Policy | Write Policy | Audit Comments |
|---|---|---|---|---|
| `profiles` | ENABLED | Public select for own profile / admins | Owner only updates; role/org protected | Triggers prevent role self-escalation |
| `organizations` | ENABLED | Verified public select; admin insert | Admins only | Safe for public read |
| `emergency_requests` | ENABLED | Authenticated owner select | Authenticated owner insert; no user updates | Status updates restricted to service-role |
| `portal_applications` | ENABLED | Applicant select only | Applicant insert; admin updates via RPC | Protected against unauthorized reads |
| `audit_logs` | ENABLED | Admins only | Service-role only (Default deny) | Fixed vulnerability permitting public inserts |

## Critical Fixes Applied

### `audit_logs` Policy Hardening
- **Vulnerability:** An earlier migration added a policy `"System can insert audit logs" WITH CHECK (true)` allowing any authenticated client to insert bogus logs directly via the PostgREST API.
- **Remediation:** Removed the policy completely in migration `20260716000000_fix_audit_rpc_grants.sql`. Since the backend runs with `service_role` authorization, it bypasses RLS and can write logs safely, while untrusted API clients are blocked.
