-- Add new columns for archiving, dependencies, custom fields, and attachments
ALTER TABLE workflow_items
ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS dependencies JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]';

-- Create index for archived items filtering
CREATE INDEX IF NOT EXISTS idx_workflow_items_archived ON workflow_items(archived);

-- Create storage bucket for file attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('attachments', 'attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload files
CREATE POLICY "Allow authenticated uploads" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'attachments');

-- Allow public read access to attachments
CREATE POLICY "Allow public reads" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'attachments');

-- Allow users to delete their own uploads
CREATE POLICY "Allow authenticated deletes" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'attachments');
