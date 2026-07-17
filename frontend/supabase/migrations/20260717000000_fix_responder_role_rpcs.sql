-- ============================================================
-- Migration: fix_responder_role_rpcs
-- Created: 2026-07-17
-- Purpose: Update accept_emergency_request and
--          update_responder_availability RPCs to recognise the
--          'responder' role that was added in the Step 13 migration.
--
-- Root cause: the original RPCs (20260714210600_add_responder_assignment)
-- were written before the 'responder' enum value existed — they only
-- checked for 'volunteer' and 'hospital'.  The Step 13 migration added
-- 'responder' to the enum but did not update these function bodies.
-- ============================================================

-- ══════════════════════════════════════════════════════════════════════
-- 1. accept_emergency_request
--    Allow roles: volunteer | hospital | hospital_staff | responder
-- ══════════════════════════════════════════════════════════════════════
create or replace function public.accept_emergency_request(request_id uuid)
returns public.emergency_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request              public.emergency_requests;
  v_profile_role         text;
  v_availability_status  text;
begin
  if auth.uid() is null then
    raise exception 'User must be authenticated';
  end if;

  select role, availability_status
  into v_profile_role, v_availability_status
  from public.profiles
  where id = auth.uid();

  -- Accept the 'responder' role in addition to the legacy volunteer/hospital roles
  if v_profile_role not in ('volunteer', 'hospital', 'hospital_staff', 'responder') then
    raise exception 'User must be a responder or hospital to accept requests';
  end if;

  if v_availability_status != 'available' then
    raise exception 'Responder must be available to accept requests';
  end if;

  select * into v_request
  from public.emergency_requests
  where id = request_id
  for update;

  if not found then
    raise exception 'Request not found';
  end if;

  if v_request.status != 'pending' or v_request.assigned_responder_id is not null then
    raise exception 'Request is not available for acceptance';
  end if;

  update public.emergency_requests
  set
    assigned_responder_id = auth.uid(),
    status      = 'accepted',
    assigned_at = now(),
    accepted_at = now(),
    updated_at  = now()
  where id = request_id
  returning * into v_request;

  return v_request;
end;
$$;

grant execute on function public.accept_emergency_request to authenticated;


-- ══════════════════════════════════════════════════════════════════════
-- 2. update_responder_availability
--    Allow roles: volunteer | hospital | hospital_staff | responder
-- ══════════════════════════════════════════════════════════════════════
create or replace function public.update_responder_availability(new_status text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_role text;
begin
  if auth.uid() is null then
    raise exception 'User must be authenticated';
  end if;

  select role into v_profile_role
  from public.profiles
  where id = auth.uid();

  if v_profile_role not in ('volunteer', 'hospital', 'hospital_staff', 'responder') then
    raise exception 'User must be a responder or hospital to update availability';
  end if;

  if new_status not in ('available', 'busy', 'offline') then
    raise exception 'Invalid availability status';
  end if;

  update public.profiles
  set
    availability_status = new_status,
    updated_at = now()
  where id = auth.uid();

  return true;
end;
$$;

grant execute on function public.update_responder_availability to authenticated;


-- ══════════════════════════════════════════════════════════════════════
-- 3. update_emergency_request_status
--    Allow roles: volunteer | hospital | hospital_staff | responder
-- ══════════════════════════════════════════════════════════════════════
create or replace function public.update_emergency_request_status(
  request_id  uuid,
  next_status text
)
returns public.emergency_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request      public.emergency_requests;
  v_profile_role text;
begin
  if auth.uid() is null then
    raise exception 'User must be authenticated';
  end if;

  select role into v_profile_role
  from public.profiles
  where id = auth.uid();

  if v_profile_role not in ('volunteer', 'hospital', 'hospital_staff', 'responder') then
    raise exception 'Insufficient role to update request status';
  end if;

  select * into v_request
  from public.emergency_requests
  where id = request_id
  for update;

  if not found then
    raise exception 'Request not found';
  end if;

  if v_request.assigned_responder_id != auth.uid() then
    raise exception 'Request is not assigned to this responder';
  end if;

  -- Enforce full state machine (matches the Step 13 migration)
  case v_request.status::text
    when 'pending' then
      if next_status not in ('accepted', 'cancelled') then
        raise exception 'Invalid transition from pending';
      end if;
    when 'accepted' then
      if next_status not in ('in_progress', 'cancelled') then
        raise exception 'Invalid transition from accepted';
      end if;
    when 'in_progress' then
      if next_status not in ('arrived', 'completed', 'cancelled') then
        raise exception 'Invalid transition from in_progress';
      end if;
    when 'arrived' then
      if next_status not in ('completed', 'cancelled') then
        raise exception 'Invalid transition from arrived';
      end if;
    else
      raise exception 'Cannot transition from terminal state %', v_request.status;
  end case;

  update public.emergency_requests
  set
    status         = next_status::public.emergency_status_enum,
    in_progress_at = case when next_status = 'in_progress' then now() else in_progress_at end,
    arrived_at     = case when next_status = 'arrived'     then now() else arrived_at     end,
    completed_at   = case when next_status = 'completed'   then now() else completed_at   end,
    cancelled_at   = case when next_status = 'cancelled'   then now() else cancelled_at   end,
    updated_at     = now()
  where id = request_id
  returning * into v_request;

  return v_request;
end;
$$;

grant execute on function public.update_emergency_request_status to authenticated;
