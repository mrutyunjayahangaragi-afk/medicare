-- ============================================================
-- Migration: add_contacts_profile_settings
-- Created: 2026-07-14
-- Purpose: Emergency contacts, profile medical fields, and user settings
-- Step 10: Emergency Contacts, Profile and User Settings
-- ============================================================

-- Enable UUID extension if not already enabled
create extension if not exists "uuid-ossp";

-- ============================================
-- EMERGENCY CONTACTS TABLE
-- ============================================
create table if not exists public.emergency_contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  full_name text not null,
  relationship text not null,
  phone_number text not null,
  alternate_phone text,
  email text,
  is_primary boolean not null default false,
  notify_during_emergency boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint full_name_length check (char_length(trim(full_name)) between 2 and 100),
  constraint relationship_length check (char_length(trim(relationship)) between 2 and 50),
  constraint phone_number_length check (char_length(trim(phone_number)) between 7 and 20),
  constraint email_format check (
    email is null
    or email = ''
    or email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
  ),
  constraint alternate_phone_format check (
    alternate_phone is null
    or alternate_phone = ''
    or char_length(trim(alternate_phone)) between 7 and 20
  ),
  constraint notes_length check (notes is null or char_length(trim(notes)) <= 300)
);

-- Indexes for emergency_contacts
create index if not exists emergency_contacts_user_created_idx 
  on public.emergency_contacts (user_id, created_at desc);

create index if not exists emergency_contacts_user_primary_idx 
  on public.emergency_contacts (user_id, is_primary);

-- Unique constraint to prevent duplicate phone numbers for same user
create unique index if not exists emergency_contacts_user_phone_unique_idx
  on public.emergency_contacts (user_id, phone_number);

-- Partial unique index to ensure only one primary contact per user
create unique index if not exists emergency_contacts_one_primary_per_user_idx
  on public.emergency_contacts (user_id)
  where is_primary = true;

-- ============================================
-- PROFILE MEDICAL FIELDS
-- ============================================

-- Add medical fields to profiles table if they don't exist
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_name = 'profiles' and column_name = 'date_of_birth'
  ) then
    alter table public.profiles 
    add column date_of_birth date;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_name = 'profiles' and column_name = 'gender'
  ) then
    alter table public.profiles 
    add column gender text;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_name = 'profiles' and column_name = 'address'
  ) then
    alter table public.profiles 
    add column address text;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_name = 'profiles' and column_name = 'blood_group'
  ) then
    alter table public.profiles 
    add column blood_group text;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_name = 'profiles' and column_name = 'allergies'
  ) then
    alter table public.profiles 
    add column allergies text;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_name = 'profiles' and column_name = 'medical_conditions'
  ) then
    alter table public.profiles 
    add column medical_conditions text;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_name = 'profiles' and column_name = 'current_medications'
  ) then
    alter table public.profiles 
    add column current_medications text;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_name = 'profiles' and column_name = 'medical_notes'
  ) then
    alter table public.profiles 
    add column medical_notes text;
  end if;
end $$;

-- Add constraints for profile fields
do $$
begin
  if not exists (
    select 1 from pg_constraint 
    where conname = 'profiles_gender_check'
  ) then
    alter table public.profiles 
    add constraint profiles_gender_check 
    check (gender is null or gender in ('male', 'female', 'other', 'prefer_not_to_say'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint 
    where conname = 'profiles_blood_group_check'
  ) then
    alter table public.profiles 
    add constraint profiles_blood_group_check 
    check (blood_group is null or blood_group in ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint 
    where conname = 'profiles_address_length_check'
  ) then
    alter table public.profiles 
    add constraint profiles_address_length_check 
    check (address is null or char_length(trim(address)) <= 300);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint 
    where conname = 'profiles_allergies_length_check'
  ) then
    alter table public.profiles 
    add constraint profiles_allergies_length_check 
    check (allergies is null or char_length(trim(allergies)) <= 500);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint 
    where conname = 'profiles_medical_conditions_length_check'
  ) then
    alter table public.profiles 
    add constraint profiles_medical_conditions_length_check 
    check (medical_conditions is null or char_length(trim(medical_conditions)) <= 500);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint 
    where conname = 'profiles_current_medications_length_check'
  ) then
    alter table public.profiles 
    add constraint profiles_current_medications_length_check 
    check (current_medications is null or char_length(trim(current_medications)) <= 500);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint 
    where conname = 'profiles_medical_notes_length_check'
  ) then
    alter table public.profiles 
    add constraint profiles_medical_notes_length_check 
    check (medical_notes is null or char_length(trim(medical_notes)) <= 1000);
  end if;
end $$;

-- ============================================
-- USER SETTINGS TABLE
-- ============================================
create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  share_medical_details boolean not null default true,
  share_phone_with_responder boolean not null default true,
  allow_location_sharing boolean not null default true,
  notify_emergency_contacts boolean not null default true,
  theme text not null default 'system',
  updated_at timestamptz not null default now(),
  constraint theme_check check (theme in ('light', 'dark', 'system'))
);

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================

-- Emergency Contacts RLS
alter table public.emergency_contacts enable row level security;

-- User Settings RLS
alter table public.user_settings enable row level security;

-- ============================================
-- EMERGENCY CONTACTS RLS POLICIES
-- ============================================

-- Users can select only their own contacts
create policy "Users can view their own emergency contacts"
  on public.emergency_contacts
  for select
  using (user_id = auth.uid());

-- Users can insert only their own contacts
create policy "Users can insert their own emergency contacts"
  on public.emergency_contacts
  for insert
  with check (user_id = auth.uid());

-- Users can update only their own contacts
create policy "Users can update their own emergency contacts"
  on public.emergency_contacts
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Users can delete only their own contacts
create policy "Users can delete their own emergency contacts"
  on public.emergency_contacts
  for delete
  using (user_id = auth.uid());

-- ============================================
-- USER SETTINGS RLS POLICIES
-- ============================================

-- Users can select only their own settings
create policy "Users can view their own settings"
  on public.user_settings
  for select
  using (user_id = auth.uid());

-- Users can insert only their own settings
create policy "Users can insert their own settings"
  on public.user_settings
  for insert
  with check (user_id = auth.uid());

-- Users can update only their own settings
create policy "Users can update their own settings"
  on public.user_settings
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ============================================
-- RPC FUNCTION: SET PRIMARY EMERGENCY CONTACT
-- ============================================
create or replace function public.set_primary_emergency_contact(
  p_contact_id uuid
)
returns jsonb as $$
declare
  v_contact public.emergency_contacts;
begin
  -- Check if user is authenticated
  if auth.uid() is null then
    raise exception 'User must be authenticated';
  end if;

  -- Lock and fetch the contact
  select * into v_contact
  from public.emergency_contacts
  where id = p_contact_id
  for update;

  -- Check if contact exists
  if not found then
    raise exception 'Contact not found';
  end if;

  -- Check if contact belongs to the user
  if v_contact.user_id != auth.uid() then
    raise exception 'You can only set your own contacts as primary';
  end if;

  -- Remove primary status from all other contacts for this user
  update public.emergency_contacts
  set is_primary = false
  where user_id = auth.uid()
  and id != p_contact_id;

  -- Set the selected contact as primary
  update public.emergency_contacts
  set 
    is_primary = true,
    updated_at = now()
  where id = p_contact_id;

  return jsonb_build_object('success', true, 'contact_id', p_contact_id);
end;
$$ language plpgsql security definer;

grant execute on function public.set_primary_emergency_contact to authenticated;

-- ============================================
-- TRIGGER FOR EMERGENCY CONTACTS UPDATED_AT
-- ============================================
create or replace function public.handle_emergency_contacts_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists emergency_contacts_updated_at on public.emergency_contacts;
create trigger emergency_contacts_updated_at
  before update on public.emergency_contacts
  for each row
  execute function public.handle_emergency_contacts_updated_at();

-- ============================================
-- TRIGGER FOR USER SETTINGS UPDATED_AT
-- ============================================
create or replace function public.handle_user_settings_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists user_settings_updated_at on public.user_settings;
create trigger user_settings_updated_at
  before update on public.user_settings
  for each row
  execute function public.handle_user_settings_updated_at();

-- ============================================
-- PROFILE-AVATARS STORAGE BUCKET
-- ============================================

-- Create private bucket for profile avatars
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-avatars',
  'profile-avatars',
  false,
  3145728, -- 3 MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- Allow authenticated users to upload only to their own folder
-- Path format: {userId}/avatar-{timestamp-safeFileName}
drop policy if exists "Users can upload own avatars" on storage.objects;
create policy "Users can upload own avatars"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'profile-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow authenticated users to read only their own files
drop policy if exists "Users can read own avatars" on storage.objects;
create policy "Users can read own avatars"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'profile-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow authenticated users to delete only their own files
drop policy if exists "Users can delete own avatars" on storage.objects;
create policy "Users can delete own avatars"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'profile-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
