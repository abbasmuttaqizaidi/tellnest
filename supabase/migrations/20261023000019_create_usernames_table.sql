-- ==============================================================================
-- Tellnest Migration 19: Dedicated Usernames Table
-- ==============================================================================

CREATE TABLE IF NOT EXISTS usernames (
    username TEXT PRIMARY KEY
);

-- Enable Row Level Security
ALTER TABLE usernames ENABLE ROW LEVEL SECURITY;

-- Allow public read access (for checking username availability and uniqueness)
CREATE POLICY "Usernames are publicly readable" ON usernames
    FOR SELECT USING (true);

-- Allow authenticated users to reserve/insert username
CREATE POLICY "Authenticated users can insert usernames" ON usernames
    FOR INSERT TO authenticated WITH CHECK (true);

-- Allow authenticated users to release/delete username
CREATE POLICY "Authenticated users can delete usernames" ON usernames
    FOR DELETE TO authenticated USING (true);

-- Backfill from existing profiles
INSERT INTO usernames (username)
SELECT username FROM profiles
WHERE username IS NOT NULL
ON CONFLICT (username) DO NOTHING;
