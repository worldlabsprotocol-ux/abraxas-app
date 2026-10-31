-- Apply manually. ABRA checkout and credit funding remain disabled until a
-- finalized settlement verifier and an approved exchange-rate source exist.
-- Financial entries are separate from best-effort partner_metering_events.

ALTER TABLE public.partner_launchpad_applications
  ADD CONSTRAINT partner_launchpad_applications_id_partner_unique UNIQUE (id, partner_id);

CREATE TABLE public.partner_service_credit_accounts (
  application_id uuid PRIMARY KEY,
  partner_id text NOT NULL REFERENCES public.partners(partner_id) ON DELETE RESTRICT,
  FOREIGN KEY (application_id, partner_id)
    REFERENCES public.partner_launchpad_applications(id, partner_id) ON DELETE RESTRICT,
  balance_cents bigint NOT NULL DEFAULT 0 CHECK (balance_cents >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (application_id, partner_id)
);

CREATE TABLE public.partner_service_credit_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL,
  partner_id text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('credit', 'debit', 'reversal')),
  amount_cents bigint NOT NULL CHECK (amount_cents > 0),
  balance_after_cents bigint NOT NULL CHECK (balance_after_cents >= 0),
  idempotency_key text NOT NULL,
  payment_intent_id uuid,
  billable_event_id uuid,
  reverses_entry_id uuid REFERENCES public.partner_service_credit_entries(id),
  billing_period_start date,
  billing_period_end date,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (application_id, partner_id)
    REFERENCES public.partner_service_credit_accounts(application_id, partner_id),
  UNIQUE (application_id, idempotency_key),
  CHECK (billing_period_start IS NULL OR
    (billing_period_end IS NOT NULL AND billing_period_end > billing_period_start)),
  CHECK ((kind = 'credit' AND payment_intent_id IS NOT NULL AND billable_event_id IS NULL AND reverses_entry_id IS NULL)
    OR (kind = 'debit' AND billable_event_id IS NOT NULL AND payment_intent_id IS NULL AND reverses_entry_id IS NULL
      AND billing_period_start IS NOT NULL)
    OR (kind = 'reversal' AND reverses_entry_id IS NOT NULL AND payment_intent_id IS NULL AND billable_event_id IS NULL)),
  UNIQUE (payment_intent_id),
  UNIQUE (billable_event_id),
  UNIQUE (reverses_entry_id)
);

-- Only reconciled, successful production operations can enter the financial
-- ledger. This table is deliberately not populated by best-effort metering.
CREATE TABLE public.partner_billable_operations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL,
  partner_id text NOT NULL,
  operation_key text NOT NULL,
  operation_type text NOT NULL CHECK (operation_type IN ('partner_flow_receipt_issued', 'partner_api_call')),
  amount_cents bigint NOT NULL CHECK (amount_cents > 0),
  billing_period_start date NOT NULL,
  billing_period_end date NOT NULL,
  source_metering_event_id uuid UNIQUE REFERENCES public.partner_metering_events(id),
  reconciled_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (application_id, partner_id)
    REFERENCES public.partner_launchpad_applications(id, partner_id),
  UNIQUE (application_id, operation_key),
  CHECK (billing_period_end > billing_period_start)
);
ALTER TABLE public.partner_service_credit_entries
  ADD CONSTRAINT partner_service_credit_billable_event_fk
  FOREIGN KEY (billable_event_id) REFERENCES public.partner_billable_operations(id);

CREATE INDEX partner_service_credit_entries_period_idx
  ON public.partner_service_credit_entries(application_id, billing_period_start, created_at);

ALTER TABLE public.partner_service_credit_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_service_credit_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_billable_operations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.partner_service_credit_accounts, public.partner_service_credit_entries
  FROM public, anon, authenticated, service_role;
REVOKE ALL ON public.partner_billable_operations FROM public, anon, authenticated;
GRANT SELECT ON public.partner_service_credit_accounts, public.partner_service_credit_entries TO service_role;
GRANT SELECT, INSERT ON public.partner_billable_operations TO service_role;

-- The only writer is a service-role RPC. There is deliberately no credit-grant
-- RPC until ABRA settlement can be independently verified. A credit entry
-- cannot be inserted directly by the application role.
CREATE FUNCTION public.debit_partner_service_credit(
  p_partner_id text, p_application_id uuid, p_event_id uuid,
  p_amount_cents bigint, p_period_start date, p_period_end date
) RETURNS text LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
DECLARE
  v_account public.partner_service_credit_accounts%ROWTYPE;
  v_existing public.partner_service_credit_entries%ROWTYPE;
  v_operation public.partner_billable_operations%ROWTYPE;
BEGIN
  IF p_amount_cents <= 0 OR p_period_start IS NULL OR p_period_end <= p_period_start
    OR p_event_id IS NULL THEN RETURN 'invalid_request'; END IF;
  SELECT * INTO v_account FROM public.partner_service_credit_accounts
    WHERE application_id = p_application_id AND partner_id = p_partner_id FOR UPDATE;
  IF NOT FOUND THEN RETURN 'account_unavailable'; END IF;
  SELECT * INTO v_operation FROM public.partner_billable_operations
    WHERE id = p_event_id AND application_id = p_application_id AND partner_id = p_partner_id;
  IF NOT FOUND OR v_operation.amount_cents <> p_amount_cents
    OR v_operation.billing_period_start <> p_period_start
    OR v_operation.billing_period_end <> p_period_end THEN RETURN 'event_unreconciled'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.partner_launchpad_applications
    WHERE id = p_application_id AND partner_id = p_partner_id AND environment = 'production')
    THEN RETURN 'sandbox_free'; END IF;
  SELECT * INTO v_existing FROM public.partner_service_credit_entries
    WHERE billable_event_id = p_event_id;
  IF FOUND THEN
    IF v_existing.application_id = p_application_id AND v_existing.partner_id = p_partner_id
      AND v_existing.amount_cents = p_amount_cents
      AND v_existing.billing_period_start = p_period_start
      AND v_existing.billing_period_end = p_period_end THEN RETURN 'already_applied'; END IF;
    RETURN 'event_conflict';
  END IF;
  IF v_account.balance_cents < p_amount_cents THEN RETURN 'insufficient_credit'; END IF;
  UPDATE public.partner_service_credit_accounts
    SET balance_cents = balance_cents - p_amount_cents
    WHERE application_id = p_application_id AND partner_id = p_partner_id;
  INSERT INTO public.partner_service_credit_entries
    (application_id, partner_id, kind, amount_cents, balance_after_cents,
     idempotency_key, billable_event_id, billing_period_start, billing_period_end)
    VALUES (p_application_id, p_partner_id, 'debit', p_amount_cents,
      v_account.balance_cents - p_amount_cents, 'usage:' || p_event_id,
      p_event_id, p_period_start, p_period_end);
  RETURN 'applied';
END;
$$;

REVOKE ALL ON FUNCTION public.debit_partner_service_credit(text, uuid, uuid, bigint, date, date)
  FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.debit_partner_service_credit(text, uuid, uuid, bigint, date, date)
  TO service_role;

CREATE FUNCTION public.reverse_partner_service_credit_debit(
  p_partner_id text, p_application_id uuid, p_debit_id uuid
) RETURNS text LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
DECLARE
  v_account public.partner_service_credit_accounts%ROWTYPE;
  v_debit public.partner_service_credit_entries%ROWTYPE;
BEGIN
  SELECT * INTO v_account FROM public.partner_service_credit_accounts
    WHERE application_id = p_application_id AND partner_id = p_partner_id FOR UPDATE;
  IF NOT FOUND THEN RETURN 'account_unavailable'; END IF;
  SELECT * INTO v_debit FROM public.partner_service_credit_entries
    WHERE id = p_debit_id AND application_id = p_application_id
      AND partner_id = p_partner_id AND kind = 'debit';
  IF NOT FOUND THEN RETURN 'debit_unavailable'; END IF;
  IF EXISTS (SELECT 1 FROM public.partner_service_credit_entries
    WHERE reverses_entry_id = p_debit_id) THEN RETURN 'already_reversed'; END IF;
  UPDATE public.partner_service_credit_accounts
    SET balance_cents = balance_cents + v_debit.amount_cents
    WHERE application_id = p_application_id AND partner_id = p_partner_id;
  INSERT INTO public.partner_service_credit_entries
    (application_id, partner_id, kind, amount_cents, balance_after_cents,
     idempotency_key, reverses_entry_id)
    VALUES (p_application_id, p_partner_id, 'reversal', v_debit.amount_cents,
      v_account.balance_cents + v_debit.amount_cents, 'reversal:' || p_debit_id,
      p_debit_id);
  RETURN 'reversed';
END;
$$;
REVOKE ALL ON FUNCTION public.reverse_partner_service_credit_debit(text, uuid, uuid)
  FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reverse_partner_service_credit_debit(text, uuid, uuid)
  TO service_role;

-- Prevent ledger mutation, including through privileged application clients.
CREATE FUNCTION public.reject_service_credit_entry_mutation() RETURNS trigger
LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN RAISE EXCEPTION 'service_credit_entries_append_only'; END;
$$;
CREATE TRIGGER partner_service_credit_entries_append_only
  BEFORE UPDATE OR DELETE ON public.partner_service_credit_entries
  FOR EACH ROW EXECUTE FUNCTION public.reject_service_credit_entry_mutation();
CREATE TRIGGER partner_billable_operations_append_only
  BEFORE UPDATE OR DELETE ON public.partner_billable_operations
  FOR EACH ROW EXECUTE FUNCTION public.reject_service_credit_entry_mutation();

-- A reconciliation report can expose missing debits without altering balances.
CREATE VIEW public.partner_service_credit_reconciliation
WITH (security_invoker = true) AS
  SELECT o.application_id, o.partner_id, o.billing_period_start, o.billing_period_end,
    count(*) AS reconciled_operations,
    count(e.id) AS credited_debits,
    sum(o.amount_cents) AS expected_cents,
    coalesce(sum(e.amount_cents), 0) AS debited_cents
  FROM public.partner_billable_operations o
  LEFT JOIN public.partner_service_credit_entries e ON e.billable_event_id = o.id
  GROUP BY o.application_id, o.partner_id, o.billing_period_start, o.billing_period_end;
REVOKE ALL ON public.partner_service_credit_reconciliation FROM public, anon, authenticated;
GRANT SELECT ON public.partner_service_credit_reconciliation TO service_role;

