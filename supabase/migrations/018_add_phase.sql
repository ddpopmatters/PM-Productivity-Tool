-- Add phase column to workflow_items
ALTER TABLE workflow_items
ADD COLUMN IF NOT EXISTS phase TEXT;

CREATE INDEX IF NOT EXISTS idx_workflow_items_phase ON workflow_items(phase);
