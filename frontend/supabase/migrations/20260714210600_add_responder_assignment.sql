-- ============================================================
-- Migration: add_responder_assignment
-- Created: 2026-07-14
-- Purpose: Add responder assignment functionality to emergency requests
-- ============================================================

-- 1. Add responder availability status to profiles
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_name = 'profiles' and column_name = 'availability_status'
  ) then
    alter table public.profiles 
    add column availability_status text not null default 'offline';
  end if;
end $$;

-- Add check constraint for availability_status
do $$
begin
  if not exists (
    select 1 from pg_constraint 
    where conname = 'profiles_availability_status_check'
  ) then
    alter table public.profiles 
    add constraint profiles_availability_status_check 
    check (availability_status in ('available', 'busy', 'offline'));
  end if;
end $$;

-- 2. Add responder type to profiles (optional, for future use)
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_name = 'profiles' and column_name = 'responder_type'
  ) then
    alter table public.profiles 
    add column responder_type text;
  end if;
end $$;

-- Add check constraint for responder_type
do $$
begin
  if not exists (
    select 1 from pg_constraint 
    where conname = 'profiles_responder_type_check'
  ) then
    alter table public.profiles 
    add constraint profiles_responder_type_check 
    check (responder_type is null or responder_type in ('ambulance', 'paramedic', 'doctor', 'nurse', 'police', 'fire', 'volunteer', 'other'));
  end if;
end $$;

-- 3. Add assignment fields to emergency_requests
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_name = 'emergency_requests' and column_name = 'assigned_responder_id'
  ) then
    alter table public.emergency_requests 
    add column assigned_responder_id uuid references auth.users(id) on delete set null;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_name = 'emergency_requests' and column_name = 'assigned_at'
  ) then
    alter table public.emergency_requests 
    add column assigned_at timestamptz;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_name = 'emergency_requests' and column_name = 'accepted_at'
  ) then
    alter table public.emergency_requests 
    add column accepted_at timestamptz;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_name = 'emergency_requests' and column_name = 'in_progress_at'
  ) then
    alter table public.emergency_requests 
    add column in_progress_at timestamptz;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_name = 'emergency_requests' and column_name = 'completed_at'
  ) then
    alter table public.emergency_requests 
    add column completed_at timestamptz;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_name = 'emergency_requests' and column_name = 'cancelled_at'
  ) then
    alter table public.emergency_requests 
    add column cancelled_at timestamptz;
  end if;
end $$;

-- 4. Create indexes for performance
create index if not exists idx_emergency_requests_status_created 
on public.emergency_requests (status, created_at desc);

create index if not exists idx_emergency_requests_responder_status 
on public.emergency_requests (assigned_responder_id, status, created_at desc);

create index if not exists idx_emergency_requests_severity_status 
on public.emergency_requests (severity, status, created_at desc);

-- 5. Create secure RPC function for accepting emergency requests
create or replace function public.accept_emergency_request(request_id uuid)
returns public.emergency_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.emergency_requests;
  v_profile_role text;
  v_availability_status text;
begin
  -- Check if user is authenticated
  if auth.uid() is null then
    raise exception 'User must be authenticated';
  end if;

  -- Get user's role and availability
  select role, availability_status into v_profile_role, v_availability_status
  from public.profiles
  where id = auth.uid();

  -- Check if user is a volunteer (responder) or hospital
  if v_profile_role not in ('volunteer', 'hospital') then
    raise exception 'User must be a volunteer or hospital to accept requests';
  end if;

  -- Check if responder is available
  if v_availability_status != 'available' then
    raise exception 'Responder must be available to accept requests';
  end if;

  -- Lock and fetch the request
  select * into v_request
  from public.emergency_requests
  where id = request_id
  for update;

  -- Check if request exists
  if not found then
    raise exception 'Request not found';
  end if;

  -- Check if request is pending and unassigned
  if v_request.status != 'pending' or v_request.assigned_responder_id is not null then
    raise exception 'Request is not available for acceptance';
  end if;

  -- Update the request atomically
  update public.emergency_requests
  set 
    assigned_responder_id = auth.uid(),
    status = 'accepted',
    assigned_at = now(),
    accepted_at = now(),
    updated_at = now()
  where id = request_id
  returning * into v_request;

  return v_request;
end;
$$;

-- Grant execute permission to authenticated users
grant execute on function public.accept_emergency_request to authenticated;

-- 6. Create secure RPC function for updating emergency request status
create or replace function public.update_emergency_request_status(
  request_id uuid,
  next_status text
)
returns public.emergency_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.emergency_requests;
  v_profile_role text;
begin
  -- Check if user is authenticated
  if auth.uid() is null then
    raise exception 'User must be authenticated';
  end if;

  -- Get user's role
  select role into v_profile_role
  from public.profiles
  where id = auth.uid();

  -- Check if user is a volunteer (responder) or hospital
  if v_profile_role not in ('volunteer', 'hospital') then
    raise exception 'User must be a volunteer or hospital to update request status';
  end if;

  -- Lock and fetch the request
  select * into v_request
  from public.emergency_requests
  where id = request_id
  for update;

  -- Check if request exists
  if not found then
    raise exception 'Request not found';
  end if;

  -- Check if request is assigned to this responder
  if v_request.assigned_responder_id != auth.uid() then
    raise exception 'Request is not assigned to this responder';
  end if;

  -- Validate status transition
  case v_request.status
    when 'accepted' then
      if next_status not in ('in_progress', 'cancelled') then
        raise exception 'Invalid status transition from accepted. Only in_progress or cancelled allowed';
      end if;
    when 'in_progress' then
      if next_status not in ('completed', 'cancelled') then
        raise exception 'Invalid status transition from in_progress. Only completed or cancelled allowed';
      end if;
    else
      raise exception 'Cannot update status from current state';
  end case;

  -- Update the request with appropriate timestamp
  case next_status
    when 'in_progress' then
      update public.emergency_requests
      set 
        status = next_status,
        in_progress_at = now(),
        updated_at = now()
      where id = request_id
      returning * into v_request;
    when 'completed' then
      update public.emergency_requests
      set 
        status = next_status,
        completed_at = now(),
        updated_at = now()
      where id = request_id
      returning * into v_request;
    when 'cancelled' then
      update public.emergency_requests
      set 
        status = next_status,
        cancelled_at = now(),
        updated_at = now()
      where id = request_id
      returning * into v_request;
    else
      raise exception 'Invalid target status';
  end case;

  return v_request;
end;
$$;

-- Grant execute permission to authenticated users
grant execute on function public.update_emergency_request_status to authenticated;

-- 7. Create function to update responder availability
create or replace function public.update_responder_availability(new_status text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_role text;
begin
  -- Check if user is authenticated
  if auth.uid() is null then
    raise exception 'User must be authenticated';
  end if;

  -- Get user's role
  select role into v_profile_role
  from public.profiles
  where id = auth.uid();

  -- Check if user is a volunteer (responder) or hospital
  if v_profile_role not in ('volunteer', 'hospital') then
    raise exception 'User must be a volunteer or hospital to update availability';
  end if;

  -- Validate status
  if new_status not in ('available', 'busy', 'offline') then
    raise exception 'Invalid availability status';
  end if;

  -- Update availability
  update public.profiles
  set 
    availability_status = new_status,
    updated_at = now()
  where id = auth.uid();

  return true;
end;
$$;

-- Grant execute permission to authenticated users
grant execute on function public.update_responder_availability to authenticated;

-- 8. Update RLS policies for responder access

-- Drop existing responder policy if it exists
drop policy if exists "Responders can view available and assigned requests" on public.emergency_requests;

-- Create responder select policy
create policy "Responders can view available and assigned requests"
  on public.emergency_requests
  for select
  to authenticated
  using (
    -- Allow viewing unassigned pending requests
    (status = 'pending' and assigned_responder_id is null)
    or
    -- Allow viewing requests assigned to the current responder
    (assigned_responder_id = auth.uid())
  );

-- Note: The existing user policies remain unchanged:
-- - Users can insert only their own rows
-- - Users can select only their own rows
-- These policies are evaluated with OR logic, so responders get broader access

-- 9. Create helper function to check if user is a responder
create or replace function public.is_responder()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
    and role in ('volunteer', 'hospital')
  );
$$;

-- Grant execute permission to authenticated users
grant execute on function public.is_responder to authenticated;
