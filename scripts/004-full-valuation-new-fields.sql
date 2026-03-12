-- Add new fields captured by the full calculator
ALTER TABLE full_valuations
  ADD COLUMN IF NOT EXISTS revenue_growth_trend TEXT,
  ADD COLUMN IF NOT EXISTS active_customers     INTEGER,
  ADD COLUMN IF NOT EXISTS active_policies      INTEGER;
