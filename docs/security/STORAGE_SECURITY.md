# Storage Security Audit Report

## Private vs. Public Buckets

The Supabase Storage buckets configured for the Medicare project are divided strictly by privacy class:

1. **`evidence` (Private)**
   - **Purpose:** Stores emergency request attachments (images, voice notes, video clips) containing PII and potentially sensitive medical data.
   - **RLS/Access Control:** Select is restricted only to the owner of the associated emergency request and authorized admin staff. Public anonymous downloads are completely blocked. Signed URL lifetime is capped at 15 minutes.

2. **`assets` (Public)**
   - **Purpose:** Stores public-facing images, icons, and non-sensitive application assets.
   - **RLS/Access Control:** Public download is enabled. Upload is restricted to verified admin/responder users.

## Security Practices Followed
- **No Direct Upload Names:** Upload files are assigned server-side randomized UUID names to prevent path traversal or directory harvesting.
- **MIME Verification:** Upload processes verify file headers (magic bytes) to ensure file types match expected images/media, preventing remote code execution (RCE) files from being uploaded.
