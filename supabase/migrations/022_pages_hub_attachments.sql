-- Migration 022: Pages Hub — document links + file attachments
-- Adds document_links column to landing_page_requests
-- Creates request_files table for Supabase Storage references
-- Creates pages-hub-files storage bucket

-- 1. Add document_links to existing requests table
ALTER TABLE landing_page_requests
  ADD COLUMN IF NOT EXISTS document_links jsonb NOT NULL DEFAULT '[]'::jsonb;

-- 2. File references table
CREATE TABLE IF NOT EXISTS request_files (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id    uuid NOT NULL REFERENCES landing_page_requests(id) ON DELETE CASCADE,
  file_name     text NOT NULL,
  file_path     text NOT NULL,   -- storage path: pages-hub-files/{request_id}/{filename}
  file_size     bigint,
  mime_type     text,
  uploaded_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS request_files_request_id_idx ON request_files(request_id);

ALTER TABLE request_files ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read files for requests they can see
DO $$ BEGIN
  CREATE POLICY "request_files_select" ON request_files
    FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Only the uploader or admins can insert
DO $$ BEGIN
  CREATE POLICY "request_files_insert" ON request_files
    FOR INSERT TO authenticated WITH CHECK (uploaded_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Only the uploader can delete their own files
DO $$ BEGIN
  CREATE POLICY "request_files_delete" ON request_files
    FOR DELETE TO authenticated USING (uploaded_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
