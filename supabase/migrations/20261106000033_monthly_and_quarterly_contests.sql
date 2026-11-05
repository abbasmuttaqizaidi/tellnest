-- ==============================================================================
-- HatchPen Migration 33: Monthly and Quarterly Writing Contests Architecture
-- ==============================================================================

-- 1. Create contests table
CREATE TABLE IF NOT EXISTS contests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    contest_type TEXT NOT NULL DEFAULT 'monthly' CHECK (contest_type IN ('monthly', 'quarterly')),
    theme TEXT NOT NULL DEFAULT 'Open Theme',
    category_restriction TEXT NULL, -- NULL or 'all' means open to all categories
    prize_inr NUMERIC NOT NULL DEFAULT 2000,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('upcoming', 'active', 'evaluating', 'completed')),
    winner_work_id UUID NULL REFERENCES works(id) ON DELETE SET NULL,
    rules_notes TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create contest_entries table
CREATE TABLE IF NOT EXISTS contest_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contest_id UUID NOT NULL REFERENCES contests(id) ON DELETE CASCADE,
    work_id UUID NOT NULL REFERENCES works(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    upi_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'accepted' CHECK (status IN ('pending', 'accepted', 'disqualified', 'winner')),
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_contest_work UNIQUE (contest_id, work_id),
    CONSTRAINT uq_contest_author UNIQUE (contest_id, author_id)
);

-- Indexes for high-performance lookups & leaderboard queries
CREATE INDEX IF NOT EXISTS idx_contests_status ON contests(status);
CREATE INDEX IF NOT EXISTS idx_contests_slug ON contests(slug);
CREATE INDEX IF NOT EXISTS idx_contests_dates ON contests(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_contest_entries_contest ON contest_entries(contest_id);
CREATE INDEX IF NOT EXISTS idx_contest_entries_work ON contest_entries(work_id);
CREATE INDEX IF NOT EXISTS idx_contest_entries_author ON contest_entries(author_id);

-- 3. Row Level Security
ALTER TABLE contests ENABLE ROW LEVEL SECURITY;
ALTER TABLE contest_entries ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Contests are publicly readable" ON contests;
    CREATE POLICY "Contests are publicly readable" ON contests
        FOR SELECT USING (true);
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- 4. Initial Seed Data: Current Monthly Contest for Asia/India Writers
INSERT INTO contests (
    title,
    slug,
    contest_type,
    theme,
    category_restriction,
    prize_inr,
    start_date,
    end_date,
    status,
    rules_notes
) VALUES (
    'The HatchPen Indie Writer Contest — ₹2,000 Cash Prize',
    'monthly-indie-contest',
    'monthly',
    'Open Theme — Original Fiction & Web Serials',
    'all',
    2000,
    DATE_TRUNC('month', NOW()),
    (DATE_TRUNC('month', NOW()) + INTERVAL '1 month - 1 second'),
    'active',
    'Maximum verified reader likes wins. Story must be published during the active contest month. Open to all independent writers in India & Asia.'
) ON CONFLICT (slug) DO NOTHING;
