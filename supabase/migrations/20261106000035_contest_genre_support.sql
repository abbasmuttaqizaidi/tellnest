-- ==============================================================================
-- HatchPen Migration 35: Contest Genre Support & Configuration
-- ==============================================================================

ALTER TABLE contests
ADD COLUMN IF NOT EXISTS genre TEXT NULL DEFAULT 'All Genres';

NOTIFY pgrst, 'reload schema';
