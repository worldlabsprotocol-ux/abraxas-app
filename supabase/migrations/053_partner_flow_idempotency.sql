-- 053_partner_flow_idempotency.sql
-- P1-2: Partner Flow decision idempotency keys on verification_decisions.
--
-- OPERATOR (copy-paste, review before apply):
--
--   STEP 0 — PREFLIGHT (read-only; run BEFORE this migration):
--   Detect duplicate active decisions per verification request + subject.
--   If this returns ANY rows: STOP. Do NOT apply migration 053.
--   Preserve all rows. Investigate and reconcile manually with an
--   evidence-backed process (audit logs, receipts, partner callbacks).
--   Do NOT delete, mutate, or silently deduplicate rows to force the index.
--
--   SELECT request_id, subject_id, count(*)
--   FROM public.verification_decisions
--   WHERE request_id IS NOT NULL
--     AND status = 'active'
--   GROUP BY request_id, subject_id
--   HAVING count(*) > 1;
--
--   Expected: zero rows. Proceed only when the preflight is clean.
--
--   STEP 1 — APPLY:
--   BEGIN;
--   \i supabase/migrations/053_partner_flow_idempotency.sql
--
--   STEP 2 — VERIFY:
--   SELECT column_name FROM information_schema.columns
--     WHERE table_schema = 'public' AND table_name = 'verification_decisions'
--       AND column_name = 'idempotency_key';
--   COMMIT;
--
-- Idempotency key conventions (server-derived, never client-authoritative):
--   pf_session:{partner_id}:{subject_id}:{policy_id}  — evaluate/refresh session receipts
--   pf_vr:{verification_request_id}                   — complete after Passport

ALTER TABLE public.verification_decisions
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_verification_decisions_idempotency_key
  ON public.verification_decisions (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- Requires STEP 0 preflight: zero duplicate active (request_id, subject_id) rows.
CREATE UNIQUE INDEX IF NOT EXISTS idx_verification_decisions_request_subject_active
  ON public.verification_decisions (request_id, subject_id)
  WHERE request_id IS NOT NULL AND status = 'active';

CREATE INDEX IF NOT EXISTS idx_verification_decisions_active_session
  ON public.verification_decisions (partner_id, subject_id, policy_id, valid_until DESC)
  WHERE status = 'active' AND request_id IS NULL;
