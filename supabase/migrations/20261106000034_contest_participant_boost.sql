-- ==============================================================================
-- HatchPen Migration 34: Contest Participant Count Admin Increment
-- ==============================================================================

ALTER TABLE contests ADD COLUMN IF NOT EXISTS participant_boost_count INTEGER NOT NULL DEFAULT 0;
