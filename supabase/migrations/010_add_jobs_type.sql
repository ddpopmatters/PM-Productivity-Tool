-- Migration: Add Jobs Type Support
-- Adds item_type column to workflow_items to differentiate projects from jobs

-- Add type field to workflow_items
ALTER TABLE workflow_items
ADD COLUMN IF NOT EXISTS item_type TEXT DEFAULT 'project';

-- Add index for filtering by type
CREATE INDEX IF NOT EXISTS idx_workflow_items_type ON workflow_items(item_type);

-- Set existing items as projects (in case any have NULL)
UPDATE workflow_items SET item_type = 'project' WHERE item_type IS NULL;

-- Add constraint for valid types
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'valid_item_type'
    ) THEN
        ALTER TABLE workflow_items
        ADD CONSTRAINT valid_item_type CHECK (item_type IN ('project', 'job'));
    END IF;
END $$;

-- Comment for documentation
COMMENT ON COLUMN workflow_items.item_type IS 'Type of item: project (full workflow) or job (simplified 3-stage)';
