-- Migration 027: Ensure pages-hub-files storage bucket is public and has policies
-- Migration 022 created the request_files table but didn't configure the bucket.

-- Ensure the bucket exists and is public (public=true means getPublicUrl works)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('pages-hub-files', 'pages-hub-files', true, 52428800)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Allow authenticated users to upload files
DO $$ BEGIN
  CREATE POLICY "pages_hub_upload"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'pages-hub-files');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Allow authenticated users to read files
DO $$ BEGIN
  CREATE POLICY "pages_hub_select"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (bucket_id = 'pages-hub-files');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Allow the uploader to delete their own files
DO $$ BEGIN
  CREATE POLICY "pages_hub_delete"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'pages-hub-files' AND owner::uuid = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
