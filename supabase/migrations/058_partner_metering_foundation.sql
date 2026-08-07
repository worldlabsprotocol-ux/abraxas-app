-- 058_partner_metering_foundation.sql
-- Append-only partner metering ledger + observe-only entitlements foundation.
--
-- OPERATOR: apply manually in Supabase SQL editor when ready.
-- No production apply from this PR.

CREATE TABLE IF NOT EXISTS public.partner_metering_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id text NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('partner_flow_receipt_issued', 'partner_api_call')),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  idempotency_key text NOT NULL,
  policy_id text,
  decision_id text,
  receipt_id text,
  api_key_id text,
  endpoint text,
  method text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT partner_metering_events_idempotency_unique UNIQUE (idempotency_key)
);

CREATE INDEX IF NOT EXISTS partner_metering_events_partner_occurred_idx
  ON public.partner_metering_events (partner_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS partner_metering_events_partner_type_occurred_idx
  ON public.partner_metering_events (partner_id, event_type, occurred_at DESC);

ALTER TABLE public.partner_metering_events ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.partner_entitlements (
  partner_id text PRIMARY KEY,
  plan_id text NOT NULL DEFAULT 'observe',
  monthly_receipt_limit integer,
  monthly_api_call_limit integer,
  enforcement_mode text NOT NULL DEFAULT 'observe'
    CHECK (enforcement_mode IN ('observe', 'enforce')),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text
);

ALTER TABLE public.partner_entitlements ENABLE ROW LEVEL SECURITY;
