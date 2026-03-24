-- Add stage column to leads table for pipeline management
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS stage TEXT DEFAULT 'new';

-- Add last_activity timestamp for tracking engagement
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS last_activity TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Update existing leads to have a stage based on their data
UPDATE leads 
SET stage = CASE 
  WHEN pipedrive_deal_id IS NOT NULL THEN 'qualified'
  WHEN estimated_value IS NOT NULL THEN 'contacted'
  ELSE 'new'
END
WHERE stage IS NULL OR stage = 'new';

-- Create index for faster stage queries
CREATE INDEX IF NOT EXISTS idx_leads_stage ON leads(stage);
