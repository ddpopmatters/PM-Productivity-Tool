-- Migration 028: Add missing status values to landing_page_status enum
-- 'pending_review' and 'first_draft' were used in application code
-- but never added to the database enum, causing 400 errors on status updates.

ALTER TYPE landing_page_status ADD VALUE IF NOT EXISTS 'pending_review' AFTER 'submitted';
ALTER TYPE landing_page_status ADD VALUE IF NOT EXISTS 'first_draft' AFTER 'in_progress';
