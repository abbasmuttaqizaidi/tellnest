-- ==============================================================================
-- Tellnest Migration 02: Core Identity, Preferences, and User Safety
-- ==============================================================================

-- 1. Profiles (Application User Entity linked to Clerk User ID)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clerk_user_id TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    bio TEXT,
    avatar_path TEXT,
    website_url TEXT,
    location TEXT,
    is_public BOOLEAN NOT NULL DEFAULT true,
    is_verified BOOLEAN NOT NULL DEFAULT false,
    verified_at TIMESTAMPTZ,
    account_status account_status NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT valid_username CHECK (username ~ '^[a-z0-9_]{3,30}$')
);

CREATE INDEX IF NOT EXISTS idx_profiles_clerk_id ON profiles(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_public_status ON profiles(is_public, account_status);

CREATE TRIGGER trg_profiles_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Helper to resolve current user's profile ID inside RLS policies
CREATE OR REPLACE FUNCTION current_profile_id()
RETURNS UUID AS $$
    SELECT id FROM public.profiles 
    WHERE clerk_user_id = current_clerk_user_id()
    LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 2. User Preferences (Separated from public profile)
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    preferred_language TEXT NOT NULL DEFAULT 'en',
    theme TEXT NOT NULL DEFAULT 'system',
    reading_mode TEXT NOT NULL DEFAULT 'standard',
    font_size INTEGER NOT NULL DEFAULT 16,
    line_height NUMERIC(3,1) NOT NULL DEFAULT 1.6,
    adult_content_enabled BOOLEAN NOT NULL DEFAULT false,
    email_notifications_enabled BOOLEAN NOT NULL DEFAULT true,
    push_notifications_enabled BOOLEAN NOT NULL DEFAULT true,
    comment_notifications_enabled BOOLEAN NOT NULL DEFAULT true,
    follow_notifications_enabled BOOLEAN NOT NULL DEFAULT true,
    new_chapter_notifications_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

CREATE TRIGGER trg_user_preferences_updated_at
BEFORE UPDATE ON user_preferences
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 3. Profile External Links
CREATE TABLE IF NOT EXISTS profile_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    platform TEXT NOT NULL,
    url TEXT NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profile_links_profile_id ON profile_links(profile_id, display_order);

-- 4. User Blocking
CREATE TABLE IF NOT EXISTS user_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blocker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_blocks UNIQUE (blocker_id, blocked_id),
    CONSTRAINT cannot_block_self CHECK (blocker_id <> blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker ON user_blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON user_blocks(blocked_id);

-- 5. User Muting
CREATE TABLE IF NOT EXISTS user_mutes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    muter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    muted_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_mutes UNIQUE (muter_id, muted_id),
    CONSTRAINT cannot_mute_self CHECK (muter_id <> muted_id)
);

CREATE INDEX IF NOT EXISTS idx_user_mutes_muter ON user_mutes(muter_id);
