-- ============================================================
-- Migration: add_hospital_portal
-- Created: 2026-07-15
-- Purpose: Hospital Portal - Staff, Beds, Ambulances, Assignments
-- Step 19: Hospital Portal
-- ============================================================

-- Enable UUID extension if not already enabled
create extension if not exists "uuid-ossp";

-- ============================================
-- HOSPITAL PROFILES TABLE
-- ============================================
create table if not exists public.hospital_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  
  -- Hospital Information
  hospital_name text not null,
  license_number text not null,
  registration_number text not null,
  
  -- Contact Information
  phone_number text not null,
  alternate_phone text,
  email text,
  website text,
  
  -- Location
  address text not null,
  latitude double precision,
  longitude double precision,
  
  -- Capacity
  total_beds integer not null default 0,
  total_icu_beds integer not null default 0,
  total_emergency_beds integer not null default 0,
  
  -- Operating Hours
  is_24_7 boolean not null default true,
  opening_time time,
  closing_time time,
  
  -- Services
  services text[], -- Array of services offered
  specialties text[], -- Array of medical specialties
  
  -- Emergency Services
  has_emergency boolean not null default true,
  has_ambulance boolean not null default false,
  has_icu boolean not null default false,
  has_surgery boolean not null default false,
  
  -- Verification
  is_verified boolean not null default false,
  verified_at timestamptz,
  verified_by uuid references auth.users(id),
  
  -- Status
  is_active boolean not null default true,
  
  -- Timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  -- Constraints
  constraint hospital_name_length check (char_length(trim(hospital_name)) between 2 and 200),
  constraint license_number_length check (char_length(trim(license_number)) between 5 and 50),
  constraint registration_number_length check (char_length(trim(registration_number)) between 5 and 50),
  constraint phone_number_length check (char_length(trim(phone_number)) between 7 and 20),
  constraint email_format check (
    email is null
    or email = ''
    or email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
  ),
  constraint address_length check (char_length(trim(address)) between 5 and 500),
  constraint total_beds_positive check (total_beds >= 0),
  constraint total_icu_beds_positive check (total_icu_beds >= 0),
  constraint total_emergency_beds_positive check (total_emergency_beds >= 0),
  constraint website_format check (
    website is null
    or website = ''
    or website ~* '^https?://[A-Za-z0-9.-]+\.[A-Za-z]{2,}'
  )
);

-- Indexes for hospital_profiles
create index if not exists hospital_profiles_user_idx 
  on public.hospital_profiles (user_id);

create index if not exists hospital_profiles_location_idx 
  on public.hospital_profiles (latitude, longitude);

create index if not exists hospital_profiles_verified_idx 
  on public.hospital_profiles (is_verified, is_active);

create index if not exists hospital_profiles_services_idx 
  on public.hospital_profiles using gin (services);

-- ============================================
-- HOSPITAL STAFF TABLE
-- ============================================
create table if not exists public.hospital_staff (
  id uuid primary key default gen_random_uuid(),
  hospital_id uuid not null references public.hospital_profiles(id) on delete cascade,
  
  -- Staff Information
  full_name text not null,
  staff_type text not null, -- doctor, nurse, paramedic, admin, other
  specialization text,
  department text,
  
  -- Contact
  phone_number text not null,
  email text,
  
  -- Availability
  is_available boolean not null default true,
  shift_start time,
  shift_end time,
  
  -- Credentials
  license_number text,
  qualifications text[],
  
  -- Status
  is_active boolean not null default true,
  
  -- Timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  -- Constraints
  constraint full_name_length check (char_length(trim(full_name)) between 2 and 100),
  constraint staff_type_check check (staff_type in ('doctor', 'nurse', 'paramedic', 'admin', 'other')),
  constraint specialization_length check (specialization is null or char_length(trim(specialization)) between 2 and 100),
  constraint department_length check (department is null or char_length(trim(department)) between 2 and 100),
  constraint phone_number_length check (char_length(trim(phone_number)) between 7 and 20),
  constraint email_format check (
    email is null
    or email = ''
    or email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
  ),
  constraint license_number_length check (license_number is null or char_length(trim(license_number)) between 5 and 50)
);

-- Indexes for hospital_staff
create index if not exists hospital_staff_hospital_idx 
  on public.hospital_staff (hospital_id);

create index if not exists hospital_staff_type_idx 
  on public.hospital_staff (staff_type, is_available);

create index if not exists hospital_staff_department_idx 
  on public.hospital_staff (department);

-- ============================================
-- HOSPITAL BEDS TABLE
-- ============================================
create table if not exists public.hospital_beds (
  id uuid primary key default gen_random_uuid(),
  hospital_id uuid not null references public.hospital_profiles(id) on delete cascade,
  
  -- Bed Information
  bed_number text not null,
  bed_type text not null, -- general, icu, emergency, pediatric, surgery
  ward text,
  floor text,
  
  -- Availability
  is_available boolean not null default true,
  is_occupied boolean not null default false,
  
  -- Equipment
  has_oxygen boolean not null default false,
  has_ventilator boolean not null default false,
  has_monitor boolean not null default false,
  
  -- Current Assignment (if occupied)
  current_patient_name text,
  current_request_id uuid references public.emergency_requests(id) on delete set null,
  admitted_at timestamptz,
  
  -- Status
  is_active boolean not null default true,
  is_under_maintenance boolean not null default false,
  
  -- Timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  -- Constraints
  constraint bed_number_length check (char_length(trim(bed_number)) between 1 and 20),
  constraint bed_type_check check (bed_type in ('general', 'icu', 'emergency', 'pediatric', 'surgery')),
  constraint ward_length check (ward is null or char_length(trim(ward)) between 2 and 50),
  constraint floor_length check (floor is null or char_length(trim(floor)) between 1 and 20),
  constraint current_patient_name_length check (current_patient_name is null or char_length(trim(current_patient_name)) between 2 and 100)
);

-- Indexes for hospital_beds
create index if not exists hospital_beds_hospital_idx 
  on public.hospital_beds (hospital_id);

create index if not exists hospital_beds_type_idx 
  on public.hospital_beds (bed_type, is_available);

create index if not exists hospital_beds_ward_idx 
  on public.hospital_beds (ward);

create index if not exists hospital_beds_request_idx 
  on public.hospital_beds (current_request_id);

-- ============================================
-- HOSPITAL AMBULANCES TABLE
-- ============================================
create table if not exists public.hospital_ambulances (
  id uuid primary key default gen_random_uuid(),
  hospital_id uuid not null references public.hospital_profiles(id) on delete cascade,
  
  -- Ambulance Information
  vehicle_number text not null,
  vehicle_type text not null, -- basic, advanced, neonatal, bariatric
  model text,
  year integer,
  
  -- Equipment
  has_oxygen boolean not null default true,
  has_ventilator boolean not null default false,
  has_defibrillator boolean not null default true,
  has_suction boolean not null default true,
  has_stretcher boolean not null default true,
  has_monitor boolean not null default false,
  
  -- Staff
  driver_name text,
  driver_phone text,
  paramedic_name text,
  paramedic_phone text,
  
  -- Location
  current_latitude double precision,
  current_longitude double precision,
  last_location_update timestamptz,
  
  -- Availability
  status text not null default 'available', -- available, busy, maintenance, out_of_service
  current_request_id uuid references public.emergency_requests(id) on delete set null,
  
  -- Status
  is_active boolean not null default true,
  
  -- Timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  -- Constraints
  constraint vehicle_number_length check (char_length(trim(vehicle_number)) between 5 and 20),
  constraint vehicle_type_check check (vehicle_type in ('basic', 'advanced', 'neonatal', 'bariatric')),
  constraint model_length check (model is null or char_length(trim(model)) between 2 and 50),
  constraint year_valid check (year is null or (year >= 1990 and year <= extract(year from now()) + 1)),
  constraint driver_name_length check (driver_name is null or char_length(trim(driver_name)) between 2 and 100),
  constraint driver_phone_length check (driver_phone is null or char_length(trim(driver_phone)) between 7 and 20),
  constraint paramedic_name_length check (paramedic_name is null or char_length(trim(paramedic_name)) between 2 and 100),
  constraint paramedic_phone_length check (paramedic_phone is null or char_length(trim(paramedic_phone)) between 7 and 20),
  constraint status_check check (status in ('available', 'busy', 'maintenance', 'out_of_service'))
);

-- Indexes for hospital_ambulances
create index if not exists hospital_ambulances_hospital_idx 
  on public.hospital_ambulances (hospital_id);

create index if not exists hospital_ambulances_status_idx 
  on public.hospital_ambulances (status, is_active);

create index if not exists hospital_ambulances_location_idx 
  on public.hospital_ambulances (current_latitude, current_longitude);

create index if not exists hospital_ambulances_request_idx 
  on public.hospital_ambulances (current_request_id);

-- ============================================
-- HOSPITAL ASSIGNMENTS TABLE
-- ============================================
create table if not exists public.hospital_assignments (
  id uuid primary key default gen_random_uuid(),
  emergency_request_id uuid not null references public.emergency_requests(id) on delete cascade,
  hospital_id uuid not null references public.hospital_profiles(id) on delete cascade,
  
  -- Assignment Details
  assigned_by uuid references auth.users(id),
  assigned_at timestamptz not null default now(),
  
  -- Staff Assignments
  assigned_doctor_id uuid references public.hospital_staff(id) on delete set null,
  assigned_nurse_id uuid references public.hospital_staff(id) on delete set null,
  assigned_paramedic_id uuid references public.hospital_staff(id) on delete set null,
  
  -- Bed Assignment
  assigned_bed_id uuid references public.hospital_beds(id) on delete set null,
  bed_assigned_at timestamptz,
  
  -- Ambulance Assignment
  assigned_ambulance_id uuid references public.hospital_ambulances(id) on delete set null,
  ambulance_assigned_at timestamptz,
  ambulance_dispatched_at timestamptz,
  ambulance_arrived_at timestamptz,
  
  -- Treatment Timeline
  patient_arrived_at timestamptz,
  treatment_started_at timestamptz,
  treatment_completed_at timestamptz,
  patient_discharged_at timestamptz,
  
  -- Treatment Details
  diagnosis text,
  treatment_notes text,
  follow_up_required boolean not null default false,
  follow_up_notes text,
  
  -- Outcome
  outcome text, -- recovered, transferred, admitted, deceased
  outcome_notes text,
  
  -- Status
  status text not null default 'assigned', -- assigned, in_transit, arrived, treating, completed, transferred
  
  -- Timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  -- Constraints
  constraint status_check check (status in ('assigned', 'in_transit', 'arrived', 'treating', 'completed', 'transferred')),
  constraint outcome_check check (outcome is null or outcome in ('recovered', 'transferred', 'admitted', 'deceased')),
  constraint diagnosis_length check (diagnosis is null or char_length(trim(diagnosis)) between 5 and 1000),
  constraint treatment_notes_length check (treatment_notes is null or char_length(trim(treatment_notes)) <= 5000),
  constraint follow_up_notes_length check (follow_up_notes is null or char_length(trim(follow_up_notes)) <= 1000),
  constraint outcome_notes_length check (outcome_notes is null or char_length(trim(outcome_notes)) <= 1000),
  
  -- Unique constraint: one assignment per emergency request
  constraint unique_emergency_request unique (emergency_request_id)
);

-- Indexes for hospital_assignments
create index if not exists hospital_assignments_request_idx 
  on public.hospital_assignments (emergency_request_id);

create index if not exists hospital_assignments_hospital_idx 
  on public.hospital_assignments (hospital_id);

create index if not exists hospital_assignments_status_idx 
  on public.hospital_assignments (status, assigned_at desc);

create index if not exists hospital_assignments_doctor_idx 
  on public.hospital_assignments (assigned_doctor_id);

create index if not exists hospital_assignments_bed_idx 
  on public.hospital_assignments (assigned_bed_id);

create index if not exists hospital_assignments_ambulance_idx 
  on public.hospital_assignments (assigned_ambulance_id);

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================

alter table public.hospital_profiles enable row level security;
alter table public.hospital_staff enable row level security;
alter table public.hospital_beds enable row level security;
alter table public.hospital_ambulances enable row level security;
alter table public.hospital_assignments enable row level security;

-- ============================================
-- HOSPITAL PROFILES RLS POLICIES
-- ============================================

-- Hospitals can view their own profile
create policy "Hospitals can view their own profile"
  on public.hospital_profiles
  for select
  to authenticated
  using (user_id = auth.uid());

-- Hospitals can insert their own profile
create policy "Hospitals can insert their own profile"
  on public.hospital_profiles
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- Hospitals can update their own profile
create policy "Hospitals can update their own profile"
  on public.hospital_profiles
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Admins can view all hospital profiles
create policy "Admins can view all hospital profiles"
  on public.hospital_profiles
  for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
      and role = 'admin'
    )
  );

-- ============================================
-- HOSPITAL STAFF RLS POLICIES
-- ============================================

-- Hospitals can view their own staff
create policy "Hospitals can view their own staff"
  on public.hospital_staff
  for select
  to authenticated
  using (
    hospital_id in (
      select id from public.hospital_profiles
      where user_id = auth.uid()
    )
  );

-- Admins can view all staff
create policy "Admins can view all hospital staff"
  on public.hospital_staff
  for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
      and role = 'admin'
    )
  );

-- ============================================
-- HOSPITAL BEDS RLS POLICIES
-- ============================================

-- Hospitals can view their own beds
create policy "Hospitals can view their own beds"
  on public.hospital_beds
  for select
  to authenticated
  using (
    hospital_id in (
      select id from public.hospital_profiles
      where user_id = auth.uid()
    )
  );

-- Admins can view all beds
create policy "Admins can view all hospital beds"
  on public.hospital_beds
  for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
      and role = 'admin'
    )
  );

-- ============================================
-- HOSPITAL AMBULANCES RLS POLICIES
-- ============================================

-- Hospitals can view their own ambulances
create policy "Hospitals can view their own ambulances"
  on public.hospital_ambulances
  for select
  to authenticated
  using (
    hospital_id in (
      select id from public.hospital_profiles
      where user_id = auth.uid()
    )
  );

-- Admins can view all ambulances
create policy "Admins can view all hospital ambulances"
  on public.hospital_ambulances
  for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
      and role = 'admin'
    )
  );

-- ============================================
-- HOSPITAL ASSIGNMENTS RLS POLICIES
-- ============================================

-- Hospitals can view their own assignments
create policy "Hospitals can view their own assignments"
  on public.hospital_assignments
  for select
  to authenticated
  using (
    hospital_id in (
      select id from public.hospital_profiles
      where user_id = auth.uid()
    )
  );

-- Admins can view all assignments
create policy "Admins can view all hospital assignments"
  on public.hospital_assignments
  for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
      and role = 'admin'
    )
  );

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================

-- Hospital profiles
create or replace function public.handle_hospital_profiles_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists hospital_profiles_updated_at on public.hospital_profiles;
create trigger hospital_profiles_updated_at
  before update on public.hospital_profiles
  for each row
  execute function public.handle_hospital_profiles_updated_at();

-- Hospital staff
create or replace function public.handle_hospital_staff_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists hospital_staff_updated_at on public.hospital_staff;
create trigger hospital_staff_updated_at
  before update on public.hospital_staff
  for each row
  execute function public.handle_hospital_staff_updated_at();

-- Hospital beds
create or replace function public.handle_hospital_beds_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists hospital_beds_updated_at on public.hospital_beds;
create trigger hospital_beds_updated_at
  before update on public.hospital_beds
  for each row
  execute function public.handle_hospital_beds_updated_at();

-- Hospital ambulances
create or replace function public.handle_hospital_ambulances_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists hospital_ambulances_updated_at on public.hospital_ambulances;
create trigger hospital_ambulances_updated_at
  before update on public.hospital_ambulances
  for each row
  execute function public.handle_hospital_ambulances_updated_at();

-- Hospital assignments
create or replace function public.handle_hospital_assignments_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists hospital_assignments_updated_at on public.hospital_assignments;
create trigger hospital_assignments_updated_at
  before update on public.hospital_assignments
  for each row
  execute function public.handle_hospital_assignments_updated_at();

-- ============================================
-- RPC FUNCTIONS FOR HOSPITAL OPERATIONS
-- ============================================

-- Function to accept emergency request as hospital
create or replace function public.hospital_accept_request(request_id uuid)
returns public.hospital_assignments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.emergency_requests;
  v_hospital_profile public.hospital_profiles;
  v_assignment public.hospital_assignments;
begin
  -- Check if user is authenticated
  if auth.uid() is null then
    raise exception 'User must be authenticated';
  end if;

  -- Get hospital profile
  select * into v_hospital_profile
  from public.hospital_profiles
  where user_id = auth.uid()
  and is_active = true;

  -- Check if hospital profile exists and is active
  if not found then
    raise exception 'Hospital profile not found or inactive';
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

  -- Check if request is pending
  if v_request.status != 'pending' then
    raise exception 'Request is not available for acceptance';
  end if;

  -- Update the request
  update public.emergency_requests
  set 
    assigned_responder_id = auth.uid(),
    status = 'hospital_assigned',
    assigned_at = now(),
    accepted_at = now(),
    updated_at = now()
  where id = request_id;

  -- Create hospital assignment
  insert into public.hospital_assignments (
    emergency_request_id,
    hospital_id,
    assigned_by,
    status
  )
  values (
    request_id,
    v_hospital_profile.id,
    auth.uid(),
    'assigned'
  )
  returning * into v_assignment;

  return v_assignment;
end;
$$;

grant execute on function public.hospital_accept_request to authenticated;

-- Function to reject emergency request
create or replace function public.hospital_reject_request(request_id uuid, reason text)
returns public.emergency_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.emergency_requests;
  v_hospital_profile public.hospital_profiles;
begin
  -- Check if user is authenticated
  if auth.uid() is null then
    raise exception 'User must be authenticated';
  end if;

  -- Get hospital profile
  select * into v_hospital_profile
  from public.hospital_profiles
  where user_id = auth.uid();

  -- Check if hospital profile exists
  if not found then
    raise exception 'Hospital profile not found';
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

  -- Check if request is assigned to this hospital
  if v_request.assigned_responder_id != auth.uid() then
    raise exception 'Request is not assigned to this hospital';
  end if;

  -- Check if request can be rejected
  if v_request.status not in ('accepted', 'hospital_assigned') then
    raise exception 'Request cannot be rejected in current state';
  end if;

  -- Update the request
  update public.emergency_requests
  set 
    assigned_responder_id = null,
    status = 'pending',
    assigned_at = null,
    accepted_at = null,
    updated_at = now()
  where id = request_id
  returning * into v_request;

  -- Delete assignment if exists
  delete from public.hospital_assignments
  where emergency_request_id = request_id;

  return v_request;
end;
$$;

grant execute on function public.hospital_reject_request to authenticated;

-- Function to assign doctor to request
create or replace function public.hospital_assign_doctor(
  request_id uuid,
  doctor_id uuid
)
returns public.hospital_assignments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_assignment public.hospital_assignments;
  v_doctor public.hospital_staff;
begin
  -- Check if user is authenticated
  if auth.uid() is null then
    raise exception 'User must be authenticated';
  end if;

  -- Get doctor
  select * into v_doctor
  from public.hospital_staff
  where id = doctor_id
  and is_active = true
  and is_available = true;

  if not found then
    raise exception 'Doctor not found or unavailable';
  end if;

  -- Lock and fetch assignment
  select * into v_assignment
  from public.hospital_assignments
  where emergency_request_id = request_id
  for update;

  if not found then
    raise exception 'Assignment not found';
  end if;

  -- Update assignment
  update public.hospital_assignments
  set 
    assigned_doctor_id = doctor_id,
    updated_at = now()
  where id = v_assignment.id
  returning * into v_assignment;

  return v_assignment;
end;
$$;

grant execute on function public.hospital_assign_doctor to authenticated;

-- Function to assign ambulance to request
create or replace function public.hospital_assign_ambulance(
  request_id uuid,
  ambulance_id uuid
)
returns public.hospital_assignments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_assignment public.hospital_assignments;
  v_ambulance public.hospital_ambulances;
begin
  -- Check if user is authenticated
  if auth.uid() is null then
    raise exception 'User must be authenticated';
  end if;

  -- Get ambulance
  select * into v_ambulance
  from public.hospital_ambulances
  where id = ambulance_id
  and is_active = true
  and status = 'available';

  if not found then
    raise exception 'Ambulance not found or unavailable';
  end if;

  -- Lock and fetch assignment
  select * into v_assignment
  from public.hospital_assignments
  where emergency_request_id = request_id
  for update;

  if not found then
    raise exception 'Assignment not found';
  end if;

  -- Update assignment
  update public.hospital_assignments
  set 
    assigned_ambulance_id = ambulance_id,
    ambulance_assigned_at = now(),
    status = 'in_transit',
    updated_at = now()
  where id = v_assignment.id
  returning * into v_assignment;

  -- Update ambulance status
  update public.hospital_ambulances
  set 
    status = 'busy',
    current_request_id = request_id,
    updated_at = now()
  where id = ambulance_id;

  return v_assignment;
end;
$$;

grant execute on function public.hospital_assign_ambulance to authenticated;

-- Function to update bed availability
create or replace function public.update_bed_availability(
  bed_id uuid,
  is_available boolean,
  is_occupied boolean
)
returns public.hospital_beds
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bed public.hospital_beds;
  v_hospital_profile public.hospital_profiles;
begin
  -- Check if user is authenticated
  if auth.uid() is null then
    raise exception 'User must be authenticated';
  end if;

  -- Get hospital profile
  select * into v_hospital_profile
  from public.hospital_profiles
  where user_id = auth.uid();

  if not found then
    raise exception 'Hospital profile not found';
  end if;

  -- Lock and fetch bed
  select * into v_bed
  from public.hospital_beds
  where id = bed_id
  for update;

  if not found then
    raise exception 'Bed not found';
  end if;

  -- Check if bed belongs to hospital
  if v_bed.hospital_id != v_hospital_profile.id then
    raise exception 'Bed does not belong to this hospital';
  end if;

  -- Update bed
  update public.hospital_beds
  set 
    is_available = is_available,
    is_occupied = is_occupied,
    updated_at = now()
  where id = bed_id
  returning * into v_bed;

  return v_bed;
end;
$$;

grant execute on function public.update_bed_availability to authenticated;

-- Function to update ambulance status
create or replace function public.update_ambulance_status(
  ambulance_id uuid,
  status text,
  current_latitude double precision default null,
  current_longitude double precision default null
)
returns public.hospital_ambulances
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ambulance public.hospital_ambulances;
  v_hospital_profile public.hospital_profiles;
begin
  -- Check if user is authenticated
  if auth.uid() is null then
    raise exception 'User must be authenticated';
  end if;

  -- Get hospital profile
  select * into v_hospital_profile
  from public.hospital_profiles
  where user_id = auth.uid();

  if not found then
    raise exception 'Hospital profile not found';
  end if;

  -- Lock and fetch ambulance
  select * into v_ambulance
  from public.hospital_ambulances
  where id = ambulance_id
  for update;

  if not found then
    raise exception 'Ambulance not found';
  end if;

  -- Check if ambulance belongs to hospital
  if v_ambulance.hospital_id != v_hospital_profile.id then
    raise exception 'Ambulance does not belong to this hospital';
  end if;

  -- Validate status
  if status not in ('available', 'busy', 'maintenance', 'out_of_service') then
    raise exception 'Invalid status';
  end if;

  -- Update ambulance
  update public.hospital_ambulances
  set 
    status = status,
    current_latitude = current_latitude,
    current_longitude = current_longitude,
    last_location_update = now(),
    updated_at = now()
  where id = ambulance_id
  returning * into v_ambulance;

  return v_ambulance;
end;
$$;

grant execute on function public.update_ambulance_status to authenticated;
