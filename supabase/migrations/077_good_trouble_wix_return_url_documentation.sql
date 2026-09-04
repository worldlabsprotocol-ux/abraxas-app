-- FILE: supabase/migrations/077_good_trouble_wix_return_url_documentation.sql
-- Operator documentation migration: Wix production callback URL for Good Trouble pilot.
-- Apply manually after review — does not auto-run in production without operator approval.

-- Example (uncomment and run when Wix production callback is approved):
-- UPDATE partners
-- SET allowed_return_urls = array_append(
--   COALESCE(allowed_return_urls, ARRAY[]::text[]),
--   'https://www.goodtroublecanna.com/age-verification-result'
-- )
-- WHERE id = 'good-trouble-cannabis'
--   AND NOT ('https://www.goodtroublecanna.com/age-verification-result' = ANY(COALESCE(allowed_return_urls, ARRAY[]::text[])));

SELECT 1;
