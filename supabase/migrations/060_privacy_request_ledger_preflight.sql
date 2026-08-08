-- 060_privacy_request_ledger_preflight.sql
-- READ-ONLY operator preflight — run BEFORE applying 060_privacy_request_ledger.sql
-- No DDL, no writes. Safe to run in production SQL editor.

-- Prerequisite tables
SELECT
  to_regclass('public.identity_verifications') IS NOT NULL AS identity_verifications_exists,
  to_regclass('public.sui_zklogin_identities') IS NOT NULL AS sui_zklogin_identities_exists,
  to_regclass('public.audit_events') IS NOT NULL AS audit_events_exists;

-- Migration 060 not yet applied (expected pre-apply)
SELECT
  to_regclass('public.privacy_requests') IS NULL AS privacy_requests_absent,
  to_regclass('public.privacy_request_events') IS NULL AS privacy_request_events_absent;

-- Legacy storage path note (historical limitation — not fixed by 060)
SELECT
  'legacy_email_based_passport_document_paths_remain' AS notice,
  count(*) AS legacy_path_rows
FROM public.passport_documents
WHERE storage_path ~ '^identity/[^v][^/]*/'
   OR storage_path ~ '/[^/]+_[^/]+_[^/]+/';
