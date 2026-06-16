-- Start Of Day managed file storage.
-- Hermes refreshes the per-user `current/<email>/` folder each morning before
-- inserting the new packet, so this bucket should not grow indefinitely.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'start-of-day-files',
  'start-of-day-files',
  false,
  52428800,
  ARRAY[
    'application/csv',
    'application/octet-stream',
    'application/msword',
    'application/pdf',
    'application/rtf',
    'application/vnd.apple.keynote',
    'application/vnd.apple.numbers',
    'application/vnd.apple.pages',
    'application/vnd.ms-excel',
    'application/vnd.ms-powerpoint',
    'application/vnd.oasis.opendocument.presentation',
    'application/vnd.oasis.opendocument.spreadsheet',
    'application/vnd.oasis.opendocument.text',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/csv',
    'text/html',
    'text/markdown',
    'text/plain',
    'text/rtf',
    'text/tab-separated-values'
  ]
)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

ALTER TABLE public.start_of_day_items
ADD COLUMN IF NOT EXISTS storage_bucket text,
ADD COLUMN IF NOT EXISTS storage_path text,
ADD COLUMN IF NOT EXISTS storage_mime_type text,
ADD COLUMN IF NOT EXISTS storage_file_size bigint,
ADD COLUMN IF NOT EXISTS storage_uploaded_at timestamptz;

CREATE INDEX IF NOT EXISTS start_of_day_items_storage_path_idx
  ON public.start_of_day_items(storage_bucket, storage_path)
  WHERE storage_path IS NOT NULL;

DROP POLICY IF EXISTS "start_of_day_files_select_own_current_folder" ON storage.objects;
CREATE POLICY "start_of_day_files_select_own_current_folder"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'start-of-day-files'
    AND (storage.foldername(name))[1] = 'current'
    AND (storage.foldername(name))[2] = lower(
      regexp_replace(coalesce((select auth.jwt() ->> 'email'), ''), '[^a-zA-Z0-9._-]+', '_', 'g')
    )
  );
