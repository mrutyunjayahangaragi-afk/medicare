-- ============================================================
-- Migration: seed_admin_user
-- Created: 2026-07-20
-- Purpose: Create the admin user account in auth.users and
--          set role = 'admin' in the profiles table.
--
-- HOW TO RUN:
--   1. Go to https://supabase.com/dashboard
--   2. Open your project → SQL Editor
--   3. Paste this entire file and click Run
-- ============================================================

-- Step 1: Create the user in Supabase Auth
--   This uses the internal auth schema, which is only accessible
--   via the SQL Editor (service-role). The password is hashed
--   automatically by Supabase's crypt() function.

do $$
declare
  v_user_id uuid;
  v_email   text := 'apatroti3@gmail.com';
begin

  -- Check if user already exists
  select id into v_user_id
  from auth.users
  where email = v_email
  limit 1;

  if v_user_id is null then
    -- Create auth user
    v_user_id := gen_random_uuid();

    insert into auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin,
      role,
      created_at,
      updated_at,
      aud,
      confirmation_token
    ) values (
      v_user_id,
      '00000000-0000-0000-0000-000000000000',
      v_email,
      crypt('Admin@123', gen_salt('bf')),
      now(),                         -- email pre-confirmed
      '{"provider":"email","providers":["email"]}',
      jsonb_build_object('full_name', 'Admin'),
      false,
      'authenticated',
      now(),
      now(),
      'authenticated',
      ''
    );

    raise notice 'Auth user created with id: %', v_user_id;
  else
    raise notice 'Auth user already exists with id: %', v_user_id;
  end if;

  -- Step 2: Upsert the profile with role = 'admin'
  insert into public.profiles (
    id,
    email,
    full_name,
    role,
    created_at,
    updated_at
  ) values (
    v_user_id,
    v_email,
    'Admin',
    'admin',
    now(),
    now()
  )
  on conflict (id) do update set
    role       = 'admin',
    email      = v_email,
    updated_at = now();

  raise notice 'Profile upserted with role = admin for user id: %', v_user_id;

end $$;
