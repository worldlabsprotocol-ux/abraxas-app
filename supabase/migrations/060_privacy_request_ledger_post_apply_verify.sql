-- 060_privacy_request_ledger_post_apply_verify.sql
-- READ-ONLY operator verification — run AFTER applying 060 and 061
-- No DDL, no writes.

SELECT
  to_regclass('public.privacy_requests') IS NOT NULL AS privacy_requests_exists,
  to_regclass('public.privacy_request_events') IS NOT NULL AS privacy_request_events_exists;

SELECT indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'privacy_requests'
ORDER BY indexname;

SELECT
  conname,
  pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'public.privacy_requests'::regclass
ORDER BY conname;

SELECT
  relrowsecurity AS rls_enabled
FROM pg_class
WHERE oid = 'public.privacy_requests'::regclass;

SELECT
  to_regprocedure('public.approve_privacy_deletion_atomic(uuid,text,text)') IS NOT NULL
  AS approve_privacy_deletion_atomic_exists;

SELECT indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname = 'privacy_requests_one_active_per_subject_type_idx';

-- Legacy email-based storage paths remain readable; separate purge project required.
SELECT
  'legacy_email_paths_still_present' AS historical_limitation,
  count(*) AS legacy_path_rows
FROM public.passport_documents
WHERE storage_path ~ '^identity/[^v][^/]*/'
   OR storage_path ~ '/[^/]+_[^/]+_[^/]+/';
