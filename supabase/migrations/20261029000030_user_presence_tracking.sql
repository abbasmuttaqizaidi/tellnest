-- Migration 30: User Presence & Activity Tracking (Admin Exclusive)
-- Tracks when an authenticated user was last active on the platform.

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_profiles_last_seen_at ON public.profiles(last_seen_at DESC NULLS LAST);
