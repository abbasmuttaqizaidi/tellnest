-- ==============================================================================
-- Tellnest Migration 18: Trigram Extension and GIN Search Indexes for Global Search
-- Enables sub-50ms substring and bilingual story search (including Hindi) across works
-- Stories-only search scope: works.title and works.description
-- ==============================================================================

-- 1. Enable pg_trgm for fast substring, prefix, and typo-tolerant search
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 2. GIN Trigram indexes on works for fast ILIKE substring search
-- Matches queries: title ILIKE '%term%' OR description ILIKE '%term%'
CREATE INDEX IF NOT EXISTS idx_works_title_trgm ON works USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_works_description_trgm ON works USING gin (description gin_trgm_ops);
