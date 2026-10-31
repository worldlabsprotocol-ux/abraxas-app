-- Apply manually after 155. Do not enable checkout as part of this migration.
-- Only the server-side finalized-transaction verifier may invoke settlement.
CREATE TABLE public.partner_abra_payment_intents (
  intent_id uuid PRIMARY KEY,
  partner_id text NOT NULL,
  application_id uuid NOT NULL,
  network_id text NOT NULL CHECK (network_id IN ('solana_devnet', 'solana_mainnet')),
  mint text NOT NULL CHECK (mint = '5c1FHZj36pkA3cpXcyZxDhRmQyxzUqMNQn8K5neDBAGS'),
  token_program text NOT NULL,
  recipient text NOT NULL,
  reference_pubkey text NOT NULL UNIQUE,
  token_amount_raw bigint NOT NULL CHECK (token_amount_raw > 0),
  credit_cents bigint NOT NULL CHECK (credit_cents > 0),
  rate_source text NOT NULL,
  rate_observed_at timestamptz NOT NULL,
  slippage_bps integer NOT NULL CHECK (slippage_bps BETWEEN 0 AND 100),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'settled')),
  transaction_signature text UNIQUE,
  transaction_block_time timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  settled_at timestamptz,
  FOREIGN KEY (application_id, partner_id)
    REFERENCES public.partner_launchpad_applications(id, partner_id),
  CHECK (expires_at > created_at AND expires_at <= created_at + interval '2 minutes 5 seconds'),
  CHECK ((status = 'settled') = (transaction_signature IS NOT NULL
    AND transaction_block_time IS NOT NULL AND settled_at IS NOT NULL))
);
CREATE INDEX partner_abra_payment_intents_app_created_idx
  ON public.partner_abra_payment_intents(application_id, created_at DESC);
ALTER TABLE public.partner_abra_payment_intents ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.partner_abra_payment_intents FROM public, anon, authenticated;
GRANT SELECT, INSERT ON public.partner_abra_payment_intents TO service_role;

CREATE FUNCTION public.settle_partner_abra_payment_intent(
  p_intent_id uuid, p_partner_id text, p_application_id uuid,
  p_transaction_signature text, p_transaction_block_time timestamptz
) RETURNS text LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
DECLARE
  v_intent public.partner_abra_payment_intents%ROWTYPE;
  v_balance bigint;
BEGIN
  IF p_transaction_signature IS NULL OR length(p_transaction_signature) < 64
    OR p_transaction_block_time IS NULL THEN RETURN 'invalid_proof'; END IF;
  SELECT * INTO v_intent FROM public.partner_abra_payment_intents
    WHERE intent_id = p_intent_id AND partner_id = p_partner_id
      AND application_id = p_application_id FOR UPDATE;
  IF NOT FOUND THEN RETURN 'intent_unavailable'; END IF;
  IF v_intent.status = 'settled' THEN
    IF v_intent.transaction_signature = p_transaction_signature THEN RETURN 'already_settled'; END IF;
    RETURN 'intent_conflict';
  END IF;
  IF p_transaction_block_time < v_intent.created_at
    OR p_transaction_block_time > v_intent.expires_at THEN RETURN 'expired'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.partner_launchpad_applications
    WHERE id = p_application_id AND partner_id = p_partner_id
      AND environment = 'production' AND status = 'active') THEN RETURN 'account_unavailable'; END IF;
  -- Signature uniqueness protects all tenants and intents, including races.
  IF EXISTS (SELECT 1 FROM public.partner_abra_payment_intents
    WHERE transaction_signature = p_transaction_signature) THEN RETURN 'signature_reused'; END IF;
  INSERT INTO public.partner_service_credit_accounts(application_id, partner_id)
    VALUES (p_application_id, p_partner_id) ON CONFLICT (application_id) DO NOTHING;
  SELECT balance_cents INTO v_balance FROM public.partner_service_credit_accounts
    WHERE application_id = p_application_id AND partner_id = p_partner_id FOR UPDATE;
  IF NOT FOUND THEN RETURN 'account_unavailable'; END IF;
  UPDATE public.partner_service_credit_accounts
    SET balance_cents = balance_cents + v_intent.credit_cents
    WHERE application_id = p_application_id AND partner_id = p_partner_id;
  INSERT INTO public.partner_service_credit_entries
    (application_id, partner_id, kind, amount_cents, balance_after_cents,
     idempotency_key, payment_intent_id)
    VALUES (p_application_id, p_partner_id, 'credit', v_intent.credit_cents,
      v_balance + v_intent.credit_cents, 'abra-payment:' || p_intent_id, p_intent_id);
  UPDATE public.partner_abra_payment_intents SET status = 'settled',
    transaction_signature = p_transaction_signature,
    transaction_block_time = p_transaction_block_time, settled_at = now()
    WHERE intent_id = p_intent_id;
  RETURN 'credited';
END;
$$;
REVOKE ALL ON FUNCTION public.settle_partner_abra_payment_intent(uuid, text, uuid, text, timestamptz)
  FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.settle_partner_abra_payment_intent(uuid, text, uuid, text, timestamptz)
  TO service_role;

-- Prevent editing quote terms. Only the settlement RPC may mark the intent paid.
CREATE FUNCTION public.guard_partner_abra_payment_intent_update() RETURNS trigger
LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  IF OLD.status <> 'pending' OR NEW.status <> 'settled'
    OR ROW(NEW.intent_id, NEW.partner_id, NEW.application_id, NEW.network_id,
      NEW.mint, NEW.token_program, NEW.recipient, NEW.reference_pubkey,
      NEW.token_amount_raw, NEW.credit_cents, NEW.rate_source,
      NEW.rate_observed_at, NEW.slippage_bps, NEW.created_at, NEW.expires_at)
      IS DISTINCT FROM ROW(OLD.intent_id, OLD.partner_id, OLD.application_id, OLD.network_id,
      OLD.mint, OLD.token_program, OLD.recipient, OLD.reference_pubkey,
      OLD.token_amount_raw, OLD.credit_cents, OLD.rate_source,
      OLD.rate_observed_at, OLD.slippage_bps, OLD.created_at, OLD.expires_at)
    THEN RAISE EXCEPTION 'abra_payment_intent_immutable'; END IF;
  RETURN NEW;
END;
$$;
CREATE FUNCTION public.guard_partner_abra_payment_intent_insert() RETURNS trigger
LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  IF NEW.status <> 'pending' OR NEW.transaction_signature IS NOT NULL
    OR NEW.transaction_block_time IS NOT NULL OR NEW.settled_at IS NOT NULL
    OR NOT EXISTS (SELECT 1 FROM public.partner_launchpad_applications
      WHERE id = NEW.application_id AND partner_id = NEW.partner_id
        AND environment = 'production' AND status = 'active')
    THEN RAISE EXCEPTION 'abra_payment_intent_invalid'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER partner_abra_payment_intent_insert_guard
  BEFORE INSERT ON public.partner_abra_payment_intents
  FOR EACH ROW EXECUTE FUNCTION public.guard_partner_abra_payment_intent_insert();
CREATE TRIGGER partner_abra_payment_intent_immutable
  BEFORE UPDATE ON public.partner_abra_payment_intents
  FOR EACH ROW EXECUTE FUNCTION public.guard_partner_abra_payment_intent_update();

