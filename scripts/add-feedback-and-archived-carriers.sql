-- Feedback submissions table (stores all feedback for admin review)
CREATE TABLE IF NOT EXISTS feedback (
  id          SERIAL PRIMARY KEY,
  category    TEXT NOT NULL DEFAULT 'general',
  message     TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'new',   -- new | read | responded
  response    TEXT,
  responded_at TIMESTAMP WITH TIME ZONE,
  ip_hash     TEXT,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Archived carriers table (carriers hidden from the UI but preserved)
CREATE TABLE IF NOT EXISTS archived_carriers (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  reason      TEXT,
  archived_by TEXT DEFAULT 'admin',
  archived_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  restored_at TIMESTAMP WITH TIME ZONE
);

-- Seed AmTrust as the first archived carrier
INSERT INTO archived_carriers (name, reason)
VALUES ('AmTrust', 'No suitable commission report available at this time')
ON CONFLICT (name) DO NOTHING;
