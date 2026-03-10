-- Migration 003: Add seller_stay_months to completed_deals
-- Tracks how many months the seller agreed to stay on post-close.

ALTER TABLE completed_deals
  ADD COLUMN IF NOT EXISTS seller_stay_months INTEGER;
