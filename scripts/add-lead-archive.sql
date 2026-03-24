-- Add archive columns to leads table
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS archived        BOOLEAN   NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS archive_reason  TEXT      DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS archived_at     TIMESTAMPTZ DEFAULT NULL;

-- Index for fast filtering
CREATE INDEX IF NOT EXISTS idx_leads_archived ON leads (archived);
