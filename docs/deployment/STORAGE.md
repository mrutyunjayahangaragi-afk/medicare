# Supabase Storage Configuration

## Required Buckets

| Bucket | Access Level | Contents |
|---|---|---|
| `emergency-evidence` | **Private** | Photos/files attached to emergency requests |
| `profile-avatars` | Public read, authenticated write | User profile pictures |
| `application-documents` | **Private** | Documents submitted with portal applications |
| `hospital-documents` | **Private** | Hospital-specific operational documents |

## Security Rules

### emergency-evidence

- **Never make this bucket public.** Evidence may contain sensitive personal or medical information.
- Access only through signed URLs with expiry.
- Path pattern: `{user_id}/{request_id}/{filename}`
- Path ownership must be validated on upload — the backend verifies the uploading user owns the request.
- Signed URLs must expire (recommended: 1 hour for evidence access).

### application-documents

- Private bucket. No public read.
- Only accessible by the applicant (upload) and admin (review via service role).
- Files are referenced by path in `portal_applications.supporting_document_path`.

### profile-avatars

- Public read is acceptable — avatars are not sensitive.
- Write access restricted to the authenticated owner (`{user_id}/avatar.*`).
- MIME type validation: accept only `image/jpeg`, `image/png`, `image/webp`.
- Maximum file size: 5 MB.

## Policy Checklist

Verify for each private bucket:

- [ ] Anonymous read returns 403
- [ ] Authenticated user cannot read another user's files
- [ ] Upload without matching user path returns 400/403
- [ ] Signed URL expiry is enforced (test an expired URL)
- [ ] MIME type check rejects non-image/non-document files
- [ ] Max file size is enforced

## Failed Upload Cleanup

If an upload starts but the transaction rolls back (e.g., the database insert fails after the file is uploaded), the orphaned file must be removed. Verify the backend handles this:

1. File upload to Storage succeeds
2. Database insert fails
3. Backend catches the error and calls `supabase.storage.from('bucket').remove([path])`
4. No orphaned files remain

## Anonymous Access Test

```bash
curl -I "https://YOUR_PROJECT.supabase.co/storage/v1/object/emergency-evidence/test.jpg"
# Expected: 400 or 401 — not 200
```
