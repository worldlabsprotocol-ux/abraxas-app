-- 064_partner_webhook_alert_state.sql
-- Durable cooldown state for partner webhook operational email alerts (metadata only).
--
-- Prerequisite: 063_partner_webhook_operator_ops.sql
-- OPERATOR: apply manually in Supabase SQL editor when ready.
-- No production apply from this PR.

CREATE TABLE IF NOT EXISTS public.partner_webhook_alert_state (
  alert_key         text        PRIMARY KEY,
  is_active         boolean     NOT NULL DEFAULT false,
  last_sent_at      timestamptz,
  last_recovery_at  timestamptz,
  cooldown_until    timestamptz,
  safe_metadata     jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT partner_webhook_alert_state_key_check CHECK (
    alert_key IN (
      'dispatcher_execution_failure',
      'terminal_delivery_failure',
      'excessive_backlog',
      'dispatcher_stale',
      'signing_secret_failure'
    )
  )
);

CREATE INDEX IF NOT EXISTS partner_webhook_alert_state_active_idx
  ON public.partner_webhook_alert_state (is_active)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS partner_webhook_alert_state_cooldown_idx
  ON public.partner_webhook_alert_state (cooldown_until)
  WHERE cooldown_until IS NOT NULL;

ALTER TABLE public.partner_webhook_alert_state ENABLE ROW LEVEL SECURITY;
