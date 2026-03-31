-- Ensure host_profiles has an index on user_id for admin queries.
-- (Already created in 023 but safe to re-run with IF NOT EXISTS.)
CREATE INDEX IF NOT EXISTS idx_host_profiles_user_id ON host_profiles(user_id);
