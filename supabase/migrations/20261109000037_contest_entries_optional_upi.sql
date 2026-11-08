-- Migration 37: Allow contest_entries upi_id to be nullable
-- Authors no longer need to provide UPI ID upfront when registering a manuscript.
-- Payout details are collected strictly from the verified winner at month-end.

ALTER TABLE contest_entries ALTER COLUMN upi_id DROP NOT NULL;
ALTER TABLE contest_entries ALTER COLUMN upi_id SET DEFAULT NULL;
