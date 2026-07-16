-- ============================================================
-- Migration: create_emergency_evidence_storage
-- Created: 2026-07-14
-- ============================================================

-- Create private bucket for emergency evidence
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'emergency-evidence',
  'emergency-evidence',
  false,
  5242880, -- 5 MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- Allow authenticated users to upload only to their own folder
-- Path format: {userId}/{requestId}/{timestamp-safeFileName}
drop policy if exists "Users can upload own evidence" on storage.objects;
create policy "Users can upload own evidence"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'emergency-evidence'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow authenticated users to read only their own files
drop policy if exists "Users can read own evidence" on storage.objects;
create policy "Users can read own evidence"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'emergency-evidence'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow authenticated users to delete only their own files (for cleanup)
drop policy if exists "Users can delete own evidence" on storage.objects;
create policy "Users can delete own evidence"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'emergency-evidence'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
