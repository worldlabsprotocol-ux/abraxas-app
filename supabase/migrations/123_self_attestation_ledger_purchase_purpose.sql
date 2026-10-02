-- 123_self_attestation_ledger_purchase_purpose.sql
-- Allow purpose=purchase on self_attestation_ledger for age_eligibility_only policies.
--
-- Migration 122 published good-trouble-age_21_retail-v1 v2 (L0 purchase pilot).
-- Migration 081 constrained purpose to browse only; purchase inserts failed at DB layer.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM information_schema.tables
     WHERE table_schema = 'public'
       AND table_name = 'self_attestation_ledger'
  ) THEN
    RAISE NOTICE '123: self_attestation_ledger missing — skipping purpose constraint widen';
    RETURN;
  END IF;

  ALTER TABLE public.self_attestation_ledger
    DROP CONSTRAINT IF EXISTS self_attestation_ledger_purpose_check;

  ALTER TABLE public.self_attestation_ledger
    ADD CONSTRAINT self_attestation_ledger_purpose_check
    CHECK (purpose IN ('browse', 'purchase'));

  RAISE NOTICE '123: self_attestation_ledger purpose allows browse and purchase';
END $$;
