# RPC Security Audit Report

## RPC Function Analysis

| Function | Security Definer | Grants | Input Vulnerabilities | Remediation |
|---|---|---|---|---|
| `get_my_profile` | YES | authenticated | None | Accesses auth.uid() directly |
| `write_audit_log` | YES | NONE (Revoked) | Authenticated execution | Revoked execution grant from public/authenticated |
| `approve_portal_application` | YES | authenticated | trusted client-supplied admin ID | Updated to use auth.uid() internally |
| `reject_portal_application` | YES | authenticated | trusted client-supplied admin ID | Updated to use auth.uid() internally |
| `suspend_user` | YES | authenticated | trusted client-supplied admin ID | Updated to use auth.uid() internally |
| `reactivate_user` | YES | authenticated | trusted client-supplied admin ID | Updated to use auth.uid() internally |
| `change_user_role` | YES | authenticated | trusted client-supplied admin ID | Updated to use auth.uid() internally |

## Security Definer & Search Path
All custom RPC functions are configured with `SECURITY DEFINER` and have their search path locked down to `public` to prevent search path hijacking attacks:
```sql
language plpgsql
security definer
set search_path = public
```

## Client ID Trust Vulnerability Fixed
Previously, the administrative functions took a parameter `p_admin_id UUID` and validated authorization against it. This allowed a malicious user to find an admin's UUID and pass it to execute actions. Migration `20260716000000_fix_audit_rpc_grants.sql` removes this parameter and retrieves the identity via the trusted database context `auth.uid()`.
