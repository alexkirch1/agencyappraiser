-- Site-wide archive table: replaces carrier-specific archived_carriers
-- Tracks anything archived across the platform (carriers, features, tools, pages, etc.)

CREATE TABLE IF NOT EXISTS site_archive (
  id           SERIAL PRIMARY KEY,
  section      TEXT NOT NULL,          -- e.g. 'carriers', 'features', 'tools', 'pages'
  name         TEXT NOT NULL,          -- human-readable name of the archived item
  identifier   TEXT,                   -- optional machine key (e.g. carrier slug)
  reason       TEXT,                   -- why it was archived
  archived_by  TEXT DEFAULT 'admin',
  archived_at  TIMESTAMPTZ DEFAULT now(),
  restored_at  TIMESTAMPTZ,            -- NULL = still archived
  notes        TEXT,                   -- any extra admin notes
  UNIQUE (section, name)
);

-- Migrate existing archived_carriers data into site_archive
INSERT INTO site_archive (section, name, reason, archived_by, archived_at)
SELECT 'carriers', name, reason, COALESCE(archived_by, 'admin'), archived_at
FROM archived_carriers
WHERE restored_at IS NULL
ON CONFLICT (section, name) DO NOTHING;

-- Seed AmTrust and American Modern as archived carriers
INSERT INTO site_archive (section, name, reason, archived_by)
VALUES
  ('carriers', 'AmTrust', 'No production report available', 'admin'),
  ('carriers', 'American Modern', 'Checking for available production report', 'admin')
ON CONFLICT (section, name) DO NOTHING;
