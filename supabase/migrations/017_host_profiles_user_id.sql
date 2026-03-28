-- Add user_id to link host_profiles to auth.users
ALTER TABLE host_profiles
ADD COLUMN user_id UUID REFERENCES auth.users(id);

-- Fix RLS policies: use user_id instead of id
DROP POLICY IF EXISTS "Hosts can read own profile" ON host_profiles;
DROP POLICY IF EXISTS "Hosts can update own profile" ON host_profiles;

CREATE POLICY "Hosts can read own profile" ON host_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Hosts can update own profile" ON host_profiles
  FOR UPDATE USING (auth.uid() = user_id);
