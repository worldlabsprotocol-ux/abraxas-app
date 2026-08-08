-- 060_privacy_request_ledger.sql
-- Append-only privacy request ledger for holder export/deletion workflows.
--
-- Prerequisite: 006_abraxas_id.sql, 007_sui_zklogin.sql
-- OPERATOR: apply manually in Supabase SQL editor when ready.
-- No production apply from this PR.
--
-- Design notes:
-- - Holder requests never trigger destructive deletion or storage purge.
-- - Status transitions are recorded in privacy_request_events (append-only).
-- - subject_sui is stored for ownership checks; holder APIs expose pseudonym only.

CREATE TABLE IF NOT EXISTS public.privacy_requests (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_sui           text        NOT NULL,
  subject_pseudonym_id  text        NOT NULL,
  request_type          text        NOT NULL,
  status                text        NOT NULL DEFAULT 'requested',
  reason_code           text,
  idempotency_key       text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT privacy_requests_request_type_check
    CHECK (request_type IN ('data_export', 'account_deletion')),
  CONSTRAINT privacy_requests_status_check
    CHECK (status IN (
      'requested',
      'under_review',
      'approved',
      'denied',
      'completed',
      'legal_hold',
      'access_revoked_pending_purge'
    )),
  CONSTRAINT privacy_requests_idempotency_unique UNIQUE (idempotency_key)
);

CREATE INDEX IF NOT EXISTS privacy_requests_subject_sui_idx
  ON public.privacy_requests (subject_sui, created_at DESC);

CREATE INDEX IF NOT EXISTS privacy_requests_status_idx
  ON public.privacy_requests (status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.privacy_request_events (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id            uuid        NOT NULL REFERENCES public.privacy_requests(id) ON DELETE RESTRICT,
  from_status           text,
  to_status             text        NOT NULL,
  reason_code           text        NOT NULL,
  changed_by_category   text        NOT NULL,
  admin_actor_category  text,
  idempotency_key       text,
  metadata              jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT privacy_request_events_changed_by_check
    CHECK (changed_by_category IN ('holder', 'admin', 'system')),
  CONSTRAINT privacy_request_events_idempotency_unique UNIQUE (idempotency_key)
);

CREATE INDEX IF NOT EXISTS privacy_request_events_request_idx
  ON public.privacy_request_events (request_id, created_at ASC);

ALTER TABLE public.privacy_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.privacy_request_events ENABLE ROW LEVEL SECURITY;
