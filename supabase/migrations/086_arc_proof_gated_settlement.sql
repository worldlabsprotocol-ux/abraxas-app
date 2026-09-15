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

CREATE UNIQUE INDEX IF NOT EXISTS partner_launchpad_arc_settlement_records_tx_unique
  ON public.partner_launchpad_arc_settlement_records (transaction_hash);

CREATE UNIQUE INDEX IF NOT EXISTS partner_launchpad_arc_authorizations_idempotency_unique
  ON public.partner_launchpad_arc_authorizations ((metadata->>'idempotency_key'))
  WHERE metadata->>'idempotency_key' IS NOT NULL;

CREATE OR REPLACE FUNCTION public.partner_launchpad_arc_confirm_settlement_atomic(
  p_authorization_id uuid,
  p_application_id uuid,
  p_partner_id text,
  p_transaction_hash text,
  p_block_number bigint,
  p_payer_wallet text,
  p_recipient text,
  p_token_address text,
  p_amount_micro_usdc bigint,
  p_receipt_commitment text,
  p_settlement_reference text,
  p_explorer_url text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_auth public.partner_launchpad_arc_authorizations%ROWTYPE;
  v_existing_tx uuid;
  v_now timestamptz := pg_catalog.now();
BEGIN
  SELECT * INTO v_auth
    FROM public.partner_launchpad_arc_authorizations
   WHERE id = p_authorization_id
     AND application_id = p_application_id
     AND partner_id = p_partner_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'authorization_not_found');
  END IF;

  IF v_auth.status = 'confirmed' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'duplicate_confirmation');
  END IF;

  SELECT id INTO v_existing_tx
    FROM public.partner_launchpad_arc_settlement_records
   WHERE transaction_hash = p_transaction_hash
   LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'duplicate_confirmation');
  END IF;

  UPDATE public.partner_launchpad_arc_authorizations
     SET status = 'confirmed',
         transaction_hash = p_transaction_hash,
         block_number = p_block_number,
         confirmed_at = v_now,
         updated_at = v_now
   WHERE id = p_authorization_id;

  INSERT INTO public.partner_launchpad_arc_settlement_records (
    authorization_id,
    application_id,
    partner_id,
    chain_id,
    transaction_hash,
    block_number,
    payer_wallet,
    recipient,
    token_address,
    amount_micro_usdc,
    receipt_commitment,
    settlement_reference,
    explorer_url,
    confirmed_at
  ) VALUES (
    p_authorization_id,
    p_application_id,
    p_partner_id,
    v_auth.chain_id,
    p_transaction_hash,
    p_block_number,
    p_payer_wallet,
    p_recipient,
    p_token_address,
    p_amount_micro_usdc,
    p_receipt_commitment,
    p_settlement_reference,
    p_explorer_url,
    v_now
  );

  RETURN jsonb_build_object('ok', true, 'code', 'confirmed');
END;
$$;

REVOKE ALL ON FUNCTION public.partner_launchpad_arc_confirm_settlement_atomic FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.partner_launchpad_arc_confirm_settlement_atomic TO postgres, service_role;

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
