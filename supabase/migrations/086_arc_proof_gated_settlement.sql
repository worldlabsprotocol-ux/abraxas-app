-- FILE: supabase/migrations/086_arc_proof_gated_settlement.sql
-- Arc proof gated settlement configuration and public settlement records.
--
-- Prerequisite: 084_partner_launchpad_foundation.sql, 085_partner_launchpad_hardening.sql
-- OPERATOR: apply manually after merge. Do not apply during PR validation.

CREATE TABLE IF NOT EXISTS public.partner_launchpad_arc_settlement_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL UNIQUE REFERENCES public.partner_launchpad_applications(id) ON DELETE CASCADE,
  partner_id text NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  arc_environment text NOT NULL DEFAULT 'arc_testnet'
    CHECK (arc_environment IN ('arc_testnet')),
  chain_id bigint NOT NULL DEFAULT 5042002,
  settlement_contract_address text,
  usdc_token_address text NOT NULL DEFAULT '0x3600000000000000000000000000000000000000',
  approved_recipient text NOT NULL,
  minimum_amount_micro_usdc bigint NOT NULL DEFAULT 10000,
  maximum_amount_micro_usdc bigint NOT NULL DEFAULT 100000000,
  policy_id text NOT NULL,
  policy_version integer NOT NULL DEFAULT 1,
  authorization_lifetime_seconds integer NOT NULL DEFAULT 900,
  reusable_authorization boolean NOT NULL DEFAULT false,
  paused boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT partner_launchpad_arc_settlement_amount_bounds
    CHECK (minimum_amount_micro_usdc > 0 AND maximum_amount_micro_usdc >= minimum_amount_micro_usdc)
);

CREATE INDEX IF NOT EXISTS partner_launchpad_arc_settlement_config_partner_idx
  ON public.partner_launchpad_arc_settlement_config (partner_id);

CREATE TABLE IF NOT EXISTS public.partner_launchpad_arc_authorizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.partner_launchpad_applications(id) ON DELETE CASCADE,
  partner_id text NOT NULL,
  environment text NOT NULL CHECK (environment IN ('sandbox', 'production')),
  chain_id bigint NOT NULL,
  eligible_wallet text NOT NULL,
  recipient text NOT NULL,
  token_address text NOT NULL,
  amount_micro_usdc bigint NOT NULL,
  amount_kind text NOT NULL CHECK (amount_kind IN ('exact', 'max')),
  action_type text NOT NULL DEFAULT 'usdc_transfer',
  nonce text NOT NULL UNIQUE,
  receipt_id text NOT NULL,
  receipt_commitment text NOT NULL,
  settlement_reference text NOT NULL,
  policy_id text NOT NULL,
  policy_version integer NOT NULL,
  status text NOT NULL DEFAULT 'issued'
    CHECK (status IN ('requested', 'issued', 'rejected', 'submitted', 'confirmed', 'failed', 'expired', 'replayed')),
  issued_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  confirmed_at timestamptz,
  transaction_hash text,
  block_number bigint,
  failure_code text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS partner_launchpad_arc_authorizations_app_idx
  ON public.partner_launchpad_arc_authorizations (application_id, created_at DESC);

CREATE INDEX IF NOT EXISTS partner_launchpad_arc_authorizations_status_idx
  ON public.partner_launchpad_arc_authorizations (application_id, status);

CREATE INDEX IF NOT EXISTS partner_launchpad_arc_authorizations_tx_idx
  ON public.partner_launchpad_arc_authorizations (transaction_hash)
  WHERE transaction_hash IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.partner_launchpad_arc_settlement_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  authorization_id uuid NOT NULL UNIQUE REFERENCES public.partner_launchpad_arc_authorizations(id) ON DELETE CASCADE,
  application_id uuid NOT NULL REFERENCES public.partner_launchpad_applications(id) ON DELETE CASCADE,
  partner_id text NOT NULL,
  chain_id bigint NOT NULL,
  transaction_hash text NOT NULL,
  block_number bigint,
  payer_wallet text NOT NULL,
  recipient text NOT NULL,
  token_address text NOT NULL,
  amount_micro_usdc bigint NOT NULL,
  receipt_commitment text NOT NULL,
  settlement_reference text NOT NULL,
  explorer_url text,
  confirmed_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS partner_launchpad_arc_settlement_records_app_idx
  ON public.partner_launchpad_arc_settlement_records (application_id, confirmed_at DESC);

ALTER TABLE public.partner_launchpad_arc_settlement_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_launchpad_arc_authorizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_launchpad_arc_settlement_records ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.partner_launchpad_arc_settlement_config FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.partner_launchpad_arc_authorizations FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.partner_launchpad_arc_settlement_records FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_launchpad_arc_settlement_config TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.partner_launchpad_arc_authorizations TO service_role;
GRANT SELECT, INSERT ON public.partner_launchpad_arc_settlement_records TO service_role;

-- Verification SQL (run after apply):
-- SELECT to_regclass('public.partner_launchpad_arc_settlement_config');
-- SELECT to_regclass('public.partner_launchpad_arc_authorizations');
-- SELECT to_regclass('public.partner_launchpad_arc_settlement_records');

-- Rollback SQL (operator only):
-- DROP TABLE IF EXISTS public.partner_launchpad_arc_settlement_records;
-- DROP TABLE IF EXISTS public.partner_launchpad_arc_authorizations;
-- DROP TABLE IF EXISTS public.partner_launchpad_arc_settlement_config;
