-- Create responder_locations table for real-time tracking
-- Stores the latest location of responders for active emergency requests

-- Enable UUID extension if not already enabled
create extension if not exists "uuid-ossp";

-- Create responder_locations table
create table if not exists public.responder_locations (
  id uuid primary key default uuid_generate_v4(),
  responder_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid not null references public.emergency_requests(id) on delete cascade,
  latitude numeric not null check (latitude >= -90 and latitude <= 90),
  longitude numeric not null check (longitude >= -180 and longitude <= 180),
  heading numeric check (heading >= 0 and heading < 360),
  speed numeric check (speed >= 0),
  accuracy numeric check (accuracy >= 0),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  constraint unique_responder_request unique (responder_id, request_id)
);

-- Create indexes for performance
create index if not exists responder_locations_responder_id_idx on public.responder_locations(responder_id);
create index if not exists responder_locations_request_id_idx on public.responder_locations(request_id);
create index if not exists responder_locations_updated_at_idx on public.responder_locations(updated_at desc);

-- Create trigger to update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger responder_locations_updated_at
  before update on public.responder_locations
  for each row
  execute function public.handle_updated_at();

-- Enable Row Level Security
alter table public.responder_locations enable row level security;

-- RLS Policies:
-- 1. Responders can insert/update their own locations
-- 2. Users can view locations for their own requests
-- 3. Responders can view locations for their assigned requests

-- Policy: Responders can insert their own locations
create policy "Responders can insert their own locations"
  on public.responder_locations
  for insert
  with check (auth.uid() = responder_id);

-- Policy: Responders can update their own locations
create policy "Responders can update their own locations"
  on public.responder_locations
  for update
  using (auth.uid() = responder_id)
  with check (auth.uid() = responder_id);

-- Policy: Users can view locations for their own requests
create policy "Users can view their request locations"
  on public.responder_locations
  for select
  using (
    exists (
      select 1 from public.emergency_requests
      where emergency_requests.id = responder_locations.request_id
      and emergency_requests.user_id = auth.uid()
    )
  );

-- Policy: Responders can view locations for their assigned requests
create policy "Responders can view their assigned request locations"
  on public.responder_locations
  for select
  using (
    exists (
      select 1 from public.emergency_requests
      where emergency_requests.id = responder_locations.request_id
      and emergency_requests.assigned_responder_id = auth.uid()
    )
  );

-- Enable Realtime for responder_locations table
alter publication supabase_realtime add table public.responder_locations;

-- Function to upsert responder location (insert or update)
create or replace function public.upsert_responder_location(
  p_request_id uuid,
  p_latitude numeric,
  p_longitude numeric,
  p_heading numeric default null,
  p_speed numeric default null,
  p_accuracy numeric default null
)
returns jsonb as $$
declare
  v_responder_id uuid;
begin
  -- Get current responder ID
  v_responder_id := auth.uid();
  
  if v_responder_id is null then
    raise exception 'User not authenticated';
  end if;

  -- Upsert the location
  insert into public.responder_locations (
    responder_id,
    request_id,
    latitude,
    longitude,
    heading,
    speed,
    accuracy
  ) values (
    v_responder_id,
    p_request_id,
    p_latitude,
    p_longitude,
    p_heading,
    p_speed,
    p_accuracy
  )
  on conflict (responder_id, request_id)
  do update set
    latitude = excluded.latitude,
    longitude = excluded.longitude,
    heading = excluded.heading,
    speed = excluded.speed,
    accuracy = excluded.accuracy,
    updated_at = now();

  -- Return the upserted location
  return jsonb_build_object(
    'success', true,
    'responder_id', v_responder_id,
    'request_id', p_request_id,
    'latitude', p_latitude,
    'longitude', p_longitude
  );
end;
$$ language plpgsql security definer;

-- Grant execute permissions on the function
grant execute on function public.upsert_responder_location to authenticated;
