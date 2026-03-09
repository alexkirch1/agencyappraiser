-- Migration 002: Completed deals (market intel) for the learning engine
-- Stores finalized deal terms so the system can calibrate future valuations.

CREATE TABLE IF NOT EXISTS completed_deals (
  id                  SERIAL PRIMARY KEY,
  -- Deal identity
  deal_name           TEXT NOT NULL,
  deal_type           TEXT NOT NULL,          -- 'full' | 'book'
  carrier             TEXT,                   -- for carrier book deals
  -- Deal financials
  appraised_low       NUMERIC(15,2),          -- our low estimate
  appraised_high      NUMERIC(15,2),          -- our high estimate
  final_offer         NUMERIC(15,2) NOT NULL, -- actual accepted offer
  premium_base        NUMERIC(15,2),          -- annual premium / revenue used
  final_multiple      NUMERIC(6,3),           -- final_offer / premium_base
  -- Terms
  deal_structure      TEXT,                   -- 'cash' | 'earnout' | 'installment' | 'mixed'
  earnout_pct         NUMERIC(5,2),           -- % of deal that was earnout
  earnout_years       INTEGER,
  seller_finance_pct  NUMERIC(5,2),
  -- Book quality at close (what actually mattered)
  retention_rate      NUMERIC(5,2),
  loss_ratio          NUMERIC(5,2),
  policies_per_cx     NUMERIC(5,2),
  preferred_pct       NUMERIC(5,2),
  -- Context
  primary_state       TEXT,
  notes               TEXT,
  closed_at           DATE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cd_deal_type  ON completed_deals(deal_type);
CREATE INDEX IF NOT EXISTS idx_cd_carrier    ON completed_deals(carrier);
CREATE INDEX IF NOT EXISTS idx_cd_closed_at  ON completed_deals(closed_at DESC);

-- ─── Market Intel View ────────────────────────────────────────────────────────
-- Aggregated stats used by the learning engine to adjust multipliers
CREATE OR REPLACE VIEW market_intel AS
SELECT
  deal_type,
  carrier,
  COUNT(*)                                         AS deal_count,
  ROUND(AVG(final_multiple)::numeric, 3)           AS avg_multiple,
  ROUND(PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY final_multiple)::numeric, 3) AS p25_multiple,
  ROUND(PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY final_multiple)::numeric, 3) AS median_multiple,
  ROUND(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY final_multiple)::numeric, 3) AS p75_multiple,
  ROUND(AVG(retention_rate)::numeric, 2)           AS avg_retention,
  ROUND(AVG(loss_ratio)::numeric, 2)               AS avg_loss_ratio,
  ROUND(AVG(policies_per_cx)::numeric, 2)          AS avg_policies_per_cx,
  ROUND(AVG(earnout_pct)::numeric, 2)              AS avg_earnout_pct,
  MAX(closed_at)                                   AS last_deal_closed
FROM completed_deals
GROUP BY deal_type, carrier;
