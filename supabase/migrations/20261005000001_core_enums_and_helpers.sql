-- ==============================================================================
-- Tellnest Migration 01: Core Extensions, Enums, and Helper Functions
-- ==============================================================================

-- 1. Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Enumerated Types
DO $$ BEGIN
    CREATE TYPE account_status AS ENUM ('active', 'suspended', 'banned', 'deactivated');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE work_status AS ENUM ('ongoing', 'completed', 'on_hiatus', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE work_visibility AS ENUM ('draft', 'private', 'unlisted', 'public');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE publication_status AS ENUM ('draft', 'published', 'archived');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE content_rating AS ENUM ('general', 'teen', 'mature');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE chapter_status AS ENUM ('draft', 'published', 'archived');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE comment_status AS ENUM ('visible', 'hidden', 'removed', 'pending_review');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE notification_type AS ENUM (
        'new_follower', 
        'new_chapter', 
        'comment', 
        'comment_reply', 
        'work_update', 
        'moderation', 
        'system'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE report_reason AS ENUM (
        'spam', 
        'harassment', 
        'hate', 
        'sexual_content', 
        'copyright', 
        'plagiarism', 
        'illegal_content', 
        'impersonation', 
        'misinformation', 
        'other'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE report_status AS ENUM ('pending', 'reviewing', 'resolved', 'dismissed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE moderation_action_type AS ENUM (
        'warning', 
        'hide', 
        'remove', 
        'restrict', 
        'suspend', 
        'restore', 
        'ban', 
        'mark_safe'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Automatic updated_at Trigger Function
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Clerk Authentication & Profile Resolution Helpers for RLS
CREATE OR REPLACE FUNCTION current_clerk_user_id()
RETURNS TEXT AS $$
    SELECT COALESCE(
        auth.jwt() ->> 'sub',
        current_setting('request.jwt.claim.sub', true)
    );
$$ LANGUAGE sql STABLE;
