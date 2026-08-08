-- 062_partner_webhook_outbox.sql
-- Signed partner webhook outbox + delivery attempt log.
--
-- Prerequisite: 025_partners_registry.sql
-- OPERATOR: apply manually in Supabase SQL editor when ready.
-- No production apply from this PR.
--
-- Webhooks are notification-only. Partners must re-fetch public receipts and
-- validate currently_valid before granting access.
--
-- Outbox delivery leases (delivery_lease_until, delivery_worker_id) prevent
-- stuck `delivering` rows when a cron worker crashes mid-dispatch.

CREATE TABLE IF NOT EXISTS public.partner_webhook_configs (
  partner_id                 text        PRIMARY KEY REFERENCES public.partners(partner_id),
  endpoint_url               text        NOT NULL,
  signing_secret_ciphertext  text        NOT NULL,
  signing_secret_iv          text        NOT NULL,
  signing_secret_prefix      text        NOT NULL,
  enabled                    boolean     NOT NULL DEFAULT false,
  secret_revealed_at         timestamptz,
  created_at                 timestamptz NOT NULL DEFAULT now(),
  updated_at                 timestamptz NOT NULL DEFAULT now(),
  enabled_at                 timestamptz,
  last_rotated_at            timestamptz
);

ALTER TABLE public.partner_webhook_configs ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.partner_webhook_outbox (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id        text        NOT NULL REFERENCES public.partners(partner_id),
  event_type        text        NOT NULL,
  event_id          text        NOT NULL UNIQUE,
  idempotency_key   text        NOT NULL UNIQUE,
  payload           jsonb       NOT NULL,
  occurred_at       timestamptz NOT NULL,
  status            text        NOT NULL DEFAULT 'pending',
  attempt_count     integer     NOT NULL DEFAULT 0,
  next_attempt_at   timestamptz NOT NULL DEFAULT now(),
  delivered_at      timestamptz,
  last_error_code   text,
  delivery_lease_until timestamptz,
  delivery_worker_id   text,
  delivery_claim_id    uuid,
  delivery_attempt_number integer,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT partner_webhook_outbox_event_type_check
    CHECK (event_type IN (
      'partner.receipt.issued',
      'partner.receipt.revoked',
      'partner.access.revoked',
      'partner.credential.revoked'
    )),
  CONSTRAINT partner_webhook_outbox_status_check
    CHECK (status IN ('pending', 'delivering', 'delivered', 'retrying', 'failed'))
);

CREATE INDEX IF NOT EXISTS partner_webhook_outbox_dispatch_idx
  ON public.partner_webhook_outbox (status, next_attempt_at ASC)
  WHERE status IN ('pending', 'retrying');

CREATE INDEX IF NOT EXISTS partner_webhook_outbox_expired_lease_idx
  ON public.partner_webhook_outbox (delivery_lease_until ASC)
  WHERE status = 'delivering';

CREATE INDEX IF NOT EXISTS partner_webhook_outbox_partner_occurred_idx
  ON public.partner_webhook_outbox (partner_id, occurred_at DESC);

ALTER TABLE public.partner_webhook_outbox ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.partner_webhook_delivery_attempts (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  outbox_event_id   uuid        NOT NULL REFERENCES public.partner_webhook_outbox(id) ON DELETE RESTRICT,
  partner_id        text        NOT NULL REFERENCES public.partners(partner_id),
  attempt_number    integer     NOT NULL,
  delivery_claim_id uuid        NOT NULL,
  http_status       integer,
  error_code        text,
  response_snippet  text,
  duration_ms       integer,
  attempted_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT partner_webhook_delivery_attempts_unique UNIQUE (outbox_event_id, attempt_number),
  CONSTRAINT partner_webhook_delivery_attempts_claim_unique UNIQUE (outbox_event_id, delivery_claim_id)
);

CREATE INDEX IF NOT EXISTS partner_webhook_delivery_attempts_partner_idx
  ON public.partner_webhook_delivery_attempts (partner_id, attempted_at DESC);

ALTER TABLE public.partner_webhook_delivery_attempts ENABLE ROW LEVEL SECURITY;
