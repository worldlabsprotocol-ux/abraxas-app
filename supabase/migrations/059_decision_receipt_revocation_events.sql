-- 059_decision_receipt_revocation_events.sql
-- Immutable revocation audit trail for decision receipts.
--
-- Prerequisite: 033_decision_receipts.sql
-- OPERATOR: apply manually in Supabase SQL editor when ready.
-- No production apply from this PR.
--
-- Source of truth for live validity remains decision_receipts.status + revoked_at.
-- This table records append-only operator revocation events with reason codes.

ALTER TABLE public.decision_receipts
  ADD COLUMN IF NOT EXISTS revocation_reason_code text;

CREATE TABLE IF NOT EXISTS public.decision_receipt_revocation_events (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id              text        NOT NULL REFERENCES public.decision_receipts(id) ON DELETE RESTRICT,
  verification_decision_id  uuid        NOT NULL REFERENCES public.verification_decisions(id) ON DELETE RESTRICT,
  reason_code             text        NOT NULL,
  changed_by              text        NOT NULL,
  idempotency_key         text,
  claim_ids               text[]      NOT NULL DEFAULT '{}',
  created_at              timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT decision_receipt_revocation_events_idempotency_unique UNIQUE (idempotency_key)
);

CREATE INDEX IF NOT EXISTS decision_receipt_revocation_events_receipt_idx
  ON public.decision_receipt_revocation_events (receipt_id, created_at DESC);

ALTER TABLE public.decision_receipt_revocation_events ENABLE ROW LEVEL SECURITY;
