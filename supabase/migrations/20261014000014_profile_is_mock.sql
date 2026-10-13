-- ==============================================================================
-- Hatchpen Migration 14: Mock Author Flag and Selective Backfill
-- ==============================================================================

-- 1. Add is_mock column to profiles (defaults to false for all existing and new profiles)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_mock BOOLEAN NOT NULL DEFAULT false;

-- 2. Partial index specifically targeting mock profiles to support fast admin filtering
-- without adding write overhead to standard registered user activity
CREATE INDEX IF NOT EXISTS idx_profiles_mock_users ON profiles(is_mock) WHERE is_mock = true;

-- 3. Backfill only verified admin-created mock profiles (strict admin-mock-* pattern)
-- Do not touch platform-*, static_*, or admin-user-* records
UPDATE profiles 
SET is_mock = true 
WHERE clerk_user_id LIKE 'admin-mock-%';
