-- Migration: Normalize existing api_base_url values
-- Date: 2026-01-18
-- Issue: #12

-- Step 1: Backup current data (optional, for safety)
-- CREATE TABLE site_backup AS SELECT * FROM site;

-- Step 2: Normalize existing URLs
-- This updates all existing api_base_url to follow the standard format:
-- - Protocol: https
-- - Domain: lowercase
-- - Remove trailing slash
-- - Keep path

UPDATE site
SET api_base_url =
  -- Remove trailing slash
  REGEXP_REPLACE(
    -- Convert to lowercase
    LOWER(
      -- Change http:// to https://
      REGEXP_REPLACE(api_base_url, '^http://', 'https://')
    ),
    '/$', ''
  )
WHERE
  -- Only update URLs that need normalization
  api_base_url != REGEXP_REPLACE(
    LOWER(
      REGEXP_REPLACE(api_base_url, '^http://', 'https://')
    ),
    '/$', ''
  );

-- Step 3: Verify no duplicates exist after normalization
-- Run this query to check for duplicates:
-- SELECT api_base_url, COUNT(*)
-- FROM site
-- GROUP BY api_base_url
-- HAVING COUNT(*) > 1;

-- If duplicates exist, you need to manually resolve them before proceeding

-- Step 4: The existing UNIQUE constraint on api_base_url will now enforce
-- that no duplicate protocol+domain combinations can be inserted

-- Rollback (if needed):
-- UPDATE site SET api_base_url = site_backup.api_base_url
-- FROM site_backup WHERE site.id = site_backup.id;
