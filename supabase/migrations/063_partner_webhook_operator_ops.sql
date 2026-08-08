-- 063_partner_webhook_operator_ops.sql
-- Dispatch run telemetry + admin manual-retry audit log (non-PII).
--
-- Prerequisite: 062_partner_webhook_outbox.sql
-- OPERATOR: apply manually in Supabase SQL editor when ready.
-- No production apply from this PR.

CREATE TABLE IF NOT EXISTS public.partner_webhook_dispatch_runs (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at      timestamptz NOT NULL DEFAULT now(),
  finished_at     timestamptz,
  success         boolean     NOT NULL,
  error_code      text,
  scanned         integer     NOT NULL DEFAULT 0,
  delivered       integer     NOT NULL DEFAULT 0,
  retrying        integer     NOT NULL DEFAULT 0,
  failed          integer     NOT NULL DEFAULT 0,
  skipped         integer     NOT NULL DEFAULT 0,
  stale           integer     NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS partner_webhook_dispatch_runs_started_idx
  ON public.partner_webhook_dispatch_runs (started_at DESC);

ALTER TABLE public.partner_webhook_dispatch_runs ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.partner_webhook_retry_audit (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  outbox_event_id     uuid        NOT NULL REFERENCES public.partner_webhook_outbox(id) ON DELETE RESTRICT,
  event_id            text        NOT NULL,
  partner_id          text        NOT NULL REFERENCES public.partners(partner_id),
  event_type          text        NOT NULL,
  retried_at          timestamptz NOT NULL DEFAULT now(),
  retried_by          text        NOT NULL DEFAULT 'admin',
  prior_status        text        NOT NULL,
  prior_error_code    text,
  prior_attempt_count integer     NOT NULL
);

CREATE INDEX IF NOT EXISTS partner_webhook_retry_audit_partner_idx
  ON public.partner_webhook_retry_audit (partner_id, retried_at DESC);

ALTER TABLE public.partner_webhook_retry_audit ENABLE ROW LEVEL SECURITY;
