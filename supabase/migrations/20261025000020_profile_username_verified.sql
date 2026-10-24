-- ==============================================================================
-- Tellnest Migration 20: Profile Username Verification Flag
-- ==============================================================================

-- Add dedicated is_username_verified flag to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_username_verified BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_profiles_username_verified ON profiles(is_username_verified);
