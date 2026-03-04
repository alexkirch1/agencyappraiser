-- Agency Appraiser – initial schema
-- Stores leads, full valuations, quick valuations, and quiz submissions

-- ─── Leads ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leads (
  id              SERIAL PRIMARY KEY,
  name            TEXT NOT NULL,
  email           TEXT NOT NULL,
  phone           TEXT,
  agency_name     TEXT,
  tool_used       TEXT,               -- 'full_valuation' | 'quick_value' | 'quiz'
  pipedrive_deal_id INTEGER,
  estimated_value NUMERIC(15,2),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leads_email      ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);

-- ─── Full Valuation Submissions ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS full_valuations (
  id                      SERIAL PRIMARY KEY,
  lead_id                 INTEGER REFERENCES leads(id) ON DELETE SET NULL,
  -- Section 1: Agency Profile
  scope_of_sale           NUMERIC(4,2),   -- 1.0 | 0.95 | 0.9
  year_established        INTEGER,
  primary_state           TEXT,
  employee_count          INTEGER,
  office_structure        TEXT,
  agency_description      TEXT,
  eo_claims               INTEGER,
  producer_agreements     TEXT,
  -- Section 2: Financials
  revenue_ltm             NUMERIC(15,2),
  revenue_y2              NUMERIC(15,2),
  revenue_y3              NUMERIC(15,2),
  sde_ebitda              NUMERIC(15,2),
  -- Section 3: Book of Business
  retention_rate          NUMERIC(5,2),
  policy_mix              NUMERIC(5,2),
  client_concentration    NUMERIC(5,2),
  carrier_diversification NUMERIC(5,2),
  revenue_per_employee    NUMERIC(12,2),
  top_carriers            TEXT,
  -- Section 4: Full Agency fields
  closing_timeline        TEXT,
  annual_payroll_cost     NUMERIC(15,2),
  owner_compensation      NUMERIC(15,2),
  staff_retention_risk    TEXT,
  new_business_value      NUMERIC(15,2),
  avg_client_tenure       NUMERIC(5,1),
  -- Results
  low_offer               NUMERIC(15,2),
  high_offer              NUMERIC(15,2),
  core_score              NUMERIC(5,2),
  calculated_multiple     NUMERIC(5,3),
  risk_grade              TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_full_val_lead_id    ON full_valuations(lead_id);
CREATE INDEX IF NOT EXISTS idx_full_val_created_at ON full_valuations(created_at DESC);

-- ─── Quick Valuations ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS quick_valuations (
  id              SERIAL PRIMARY KEY,
  lead_id         INTEGER REFERENCES leads(id) ON DELETE SET NULL,
  revenue         NUMERIC(15,2),
  retention       TEXT,   -- 'high' | 'average' | 'low'
  book_type       TEXT,   -- 'commercial' | 'mixed' | 'personal'
  growth          TEXT,   -- 'strong' | 'moderate' | 'flat' | 'declining'
  customers       INTEGER,
  policies        INTEGER,
  policy_ratio    NUMERIC(5,2),
  multiplier      NUMERIC(5,2),
  suggested_mult  NUMERIC(5,2),
  low_value       NUMERIC(15,2),
  mid_value       NUMERIC(15,2),
  high_value      NUMERIC(15,2),
  tier            TEXT,   -- 'high' | 'average' | 'below'
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quick_val_lead_id    ON quick_valuations(lead_id);
CREATE INDEX IF NOT EXISTS idx_quick_val_created_at ON quick_valuations(created_at DESC);

-- ─── Quiz Submissions ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS quiz_submissions (
  id              SERIAL PRIMARY KEY,
  lead_id         INTEGER REFERENCES leads(id) ON DELETE SET NULL,
  total_score     INTEGER,
  max_score       INTEGER,
  percentage      NUMERIC(5,2),
  grade           TEXT,   -- 'Ready to Sell' | 'Getting Close' | 'Not Yet Ready'
  answers         JSONB,  -- array of { category, question, answer, score }
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quiz_lead_id    ON quiz_submissions(lead_id);
CREATE INDEX IF NOT EXISTS idx_quiz_created_at ON quiz_submissions(created_at DESC);
