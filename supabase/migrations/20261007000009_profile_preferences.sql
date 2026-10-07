-- ==============================================================================
-- Tellnest Migration 09: Profile Dedicated Identity & Preferences Columns
-- ==============================================================================

-- 1. Add dedicated identity, onboarding, and structured preferences to profiles table
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS pronouns TEXT,
  ADD COLUMN IF NOT EXISTS gender TEXT,
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS preferences JSONB NOT NULL DEFAULT '{}'::jsonb;

-- 2. Index for faster JSONB taxonomy queries if needed
CREATE INDEX IF NOT EXISTS idx_profiles_preferences ON profiles USING GIN (preferences);
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding ON profiles(onboarding_completed);
