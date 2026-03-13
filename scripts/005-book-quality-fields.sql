-- Migration 005: Add loss ratio, avg premium, total premium, and seller transition fields
ALTER TABLE full_valuations ADD COLUMN IF NOT EXISTS loss_ratio NUMERIC;
ALTER TABLE full_valuations ADD COLUMN IF NOT EXISTS avg_premium_per_policy NUMERIC;
ALTER TABLE full_valuations ADD COLUMN IF NOT EXISTS total_written_premium NUMERIC;
ALTER TABLE full_valuations ADD COLUMN IF NOT EXISTS seller_transition_months INTEGER;
