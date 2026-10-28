-- Migration 31: Inspectlet Session Recording Controls & Exclusion Management
-- Allows administrators to manage Inspectlet configuration and exclude specific user accounts.

-- 1. Table for tracking excluded user accounts from session recording
CREATE TABLE IF NOT EXISTS public.inspectlet_exclusions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identifier TEXT UNIQUE NOT NULL, -- clerk_user_id, email, or username (case-insensitive)
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inspectlet_exclusions_identifier ON public.inspectlet_exclusions(LOWER(identifier));

-- 2. Table for storing global Inspectlet configuration (WID, enabled status, etc.)
CREATE TABLE IF NOT EXISTS public.inspectlet_config (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed initial default configuration row
INSERT INTO public.inspectlet_config (key, value)
VALUES ('settings', jsonb_build_object(
    'wid', COALESCE(current_setting('app.inspectlet_wid', true), ''),
    'enabled', true,
    'exclude_admin', true
))
ON CONFLICT (key) DO NOTHING;

-- Enable RLS
ALTER TABLE public.inspectlet_exclusions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspectlet_config ENABLE ROW LEVEL SECURITY;

-- Read policies for clients and application
CREATE POLICY "Allow public read access for inspectlet exclusions"
ON public.inspectlet_exclusions FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Allow public read access for inspectlet config"
ON public.inspectlet_config FOR SELECT
TO anon, authenticated
USING (true);
