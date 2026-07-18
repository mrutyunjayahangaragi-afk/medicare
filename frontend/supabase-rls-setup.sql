-- ============================================
-- Medicare Supabase RLS Policies and Triggers
-- ============================================
-- Run this in Supabase SQL Editor to fix role lookup issues
-- ============================================

-- 1. Check if RLS is enabled on profiles table
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'profiles';

-- 2. Enable RLS on profiles table if not already enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can create own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;

-- 4. Create SELECT policy - allows users to read their own profile
CREATE POLICY "Users can read own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- 5. Create INSERT policy - allows users to create their own profile with role='user' only
CREATE POLICY "Users can create own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = id
  AND role = 'user'
);

-- 6. Create UPDATE policy - allows users to update their own profile but NOT their role
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  AND role IS NOT DISTINCT FROM (SELECT role FROM profiles WHERE id = auth.uid())
);

-- 7. Create DELETE policy - allows users to delete their own profile (optional)
CREATE POLICY "Users can delete own profile"
ON public.profiles
FOR DELETE
TO authenticated
USING (auth.uid() = id);

-- ============================================
-- Database Trigger for Automatic Profile Creation
-- ============================================

-- 8. Create the function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    avatar_url,
    role,
    is_verified,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.raw_user_meta_data->>'picture'
    ),
    'user',
    true,
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    full_name = COALESCE(
      public.profiles.full_name,
      EXCLUDED.full_name
    ),
    avatar_url = COALESCE(
      public.profiles.avatar_url,
      EXCLUDED.avatar_url
    ),
    updated_at = NOW();

  RETURN NEW;
END;
$$;

-- 9. Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 10. Create the trigger
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- Verification Queries
-- ============================================

-- 11. Verify RLS policies are created
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'profiles';

-- 12. Verify trigger is created
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement,
  action_timing
FROM information_schema.triggers
WHERE event_object_table = 'users'
  AND event_object_schema = 'auth';

-- 13. Check existing profiles
SELECT
  id,
  email,
  role,
  full_name,
  created_at
FROM public.profiles
ORDER BY created_at DESC
LIMIT 10;

-- 14. Check for users without profiles
SELECT
  u.id,
  u.email,
  u.created_at,
  p.id AS profile_id,
  p.role
FROM auth.users u
LEFT JOIN public.profiles p
  ON p.id = u.id
WHERE p.id IS NULL;

-- ============================================
-- Manual Profile Creation for Existing Users
-- ============================================

-- 15. Create profiles for existing users who don't have one
INSERT INTO public.profiles (
  id,
  email,
  full_name,
  avatar_url,
  role,
  is_verified,
  updated_at
)
SELECT
  u.id,
  u.email,
  COALESCE(
    u.raw_user_meta_data->>'full_name',
    u.raw_user_meta_data->>'name',
    split_part(u.email, '@', 1)
  ),
  COALESCE(
    u.raw_user_meta_data->>'avatar_url',
    u.raw_user_meta_data->>'picture'
  ),
  'user',
  true,
  NOW()
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = u.id
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- Admin Role Promotion (Manual)
-- ============================================

-- 16. Promote a specific user to admin by email
-- UPDATE public.profiles
-- SET role = 'admin'
-- WHERE email = 'YOUR_ADMIN_EMAIL@gmail.com';

-- 17. Promote a specific user to admin by user ID
-- UPDATE public.profiles
-- SET role = 'admin'
-- WHERE id = 'YOUR_USER_ID_HERE';

-- 18. Verify admin role
-- SELECT
--   u.id,
--   u.email,
--   p.role
-- FROM auth.users u
-- JOIN public.profiles p
--   ON p.id = u.id
-- WHERE p.role = 'admin';
