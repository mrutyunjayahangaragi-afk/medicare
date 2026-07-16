# Rollback Procedures

## Frontend — Vercel

Vercel keeps a full deployment history.

1. Go to Vercel → Project → Deployments
2. Find the last known-good deployment
3. Click → **Promote to Production**

This is instant and does not affect the database or backend.

## Backend — Render

1. Go to Render → Service → Deploys
2. Find the last successful deploy with a green health check
3. Click → **Redeploy**

Or:

```bash
git revert HEAD --no-edit
git push origin main
```

Render auto-deploys on push to `main` if auto-deploy is enabled.

## Database — Supabase

### Option 1: Forward-fix migration

Write a new migration that corrects the problem without destroying data. Apply it with:

```bash
supabase db push
```

This is the preferred approach. Never manually delete production tables outside a migration.

### Option 2: Down migration

Some migrations include a `-- down:` section or a companion `_rollback.sql` file. Review `docs/database/ROLLBACK.md` for migration-specific rollback notes.

Apply with care:
```bash
# Inspect the migration first
supabase migration list
# Apply rollback SQL via the Supabase SQL editor
```

### Option 3: Point-in-time recovery (Pro plan only)

If PITR is enabled on your Supabase plan:

1. Supabase dashboard → Database → Backups → Point in Time Recovery
2. Select a timestamp before the problem migration
3. Restore to a staging project first and verify before restoring production

**Do not restore directly to production without verifying the backup.**

## Secrets — Compromised Key Response

If a secret was accidentally committed or exposed:

1. **Immediately revoke** the compromised key in its provider dashboard:
   - Supabase: Project Settings → API → Regenerate keys
   - Google AI Studio: API key management → Delete + Create new
   - Geoapify: Developer dashboard → Regenerate
   - HuggingFace: Settings → Access Tokens → Revoke

2. **Update the replacement** in Render environment variables

3. **Redeploy** the backend to pick up the new key

4. **Update** Vercel env vars if any frontend-safe key was also rotated

5. **Clean Git history** if the key was committed:
   ```bash
   git filter-repo --path .env --invert-paths
   # or use BFG Repo-Cleaner
   bfg --delete-files .env
   git push --force
   ```
   **Force-push replaces remote history.** Coordinate with all team members.

6. Document the incident with: date, key type, exposure window, remediation steps.

## Rollback Decision Matrix

| Severity | Symptoms | Action |
|---|---|---|
| P0 — Site down | Health endpoint 5xx, frontend 500 | Immediate rollback to last good deploy |
| P1 — Auth broken | Login fails for all users | Backend rollback + verify CORS + Supabase URLs |
| P1 — SOS broken | Request submission fails | Backend rollback + check DB migration |
| P2 — Feature broken | AI/ML/Nearby fails, auth still works | Fix-forward migration or feature flag |
| P3 — Cosmetic | UI glitch, non-critical | Schedule fix in next deploy |
