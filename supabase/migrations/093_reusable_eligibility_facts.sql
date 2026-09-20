-- 093_reusable_eligibility_facts.sql
-- Consent-bound reusable eligibility facts and derived-receipt provenance.
-- Internal only. Never expose fact ids, source receipts, or origin partners.
--
-- Prerequisite: 033_decision_receipts.sql, 059_decision_receipt_revocation_events.sql
-- OPERATOR: apply manually in Supabase SQL editor when ready.
-- No production apply from this PR.

CREATE TABLE IF NOT EXISTS public.reusable_eligibility_facts (
  id                      text        PRIMARY KEY,
  subject_pseudonym_id    text        NOT NULL,
  pack_id                 text        NOT NULL,
  policy_version          int         NOT NULL,
  minimum_assurance       text        NOT NULL,
  result_category         text        NOT NULL,
  decision_context        text        NOT NULL
                          CHECK (decision_context IN ('production', 'sandbox_only')),
  source_decision_id      uuid        NOT NULL REFERENCES public.verification_decisions(id) ON DELETE RESTRICT,
  source_receipt_id       text        NOT NULL REFERENCES public.decision_receipts(id) ON DELETE RESTRICT,
  issued_at               timestamptz NOT NULL,
  expires_at              timestamptz,
  revoked_at              timestamptz,
  status                  text        NOT NULL DEFAULT 'active'
                          CHECK (status IN ('active', 'expired', 'revoked')),
  created_at              timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_receipt_id)
);

CREATE INDEX IF NOT EXISTS reusable_eligibility_facts_subject_idx
  ON public.reusable_eligibility_facts (subject_pseudonym_id, pack_id, policy_version, status);

ALTER TABLE public.reusable_eligibility_facts ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.reusable_eligibility_derivations (
  id                        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  fact_id                   text        NOT NULL REFERENCES public.reusable_eligibility_facts(id) ON DELETE RESTRICT,
  source_receipt_id         text        NOT NULL,
  derived_receipt_id        text        NOT NULL REFERENCES public.decision_receipts(id) ON DELETE RESTRICT,
  derived_decision_id       uuid        NOT NULL REFERENCES public.verification_decisions(id) ON DELETE RESTRICT,
  requesting_partner_id     text        NOT NULL,
  requesting_policy_id      text        NOT NULL,
  requesting_policy_version int         NOT NULL,
  verify_request_id         text,
  created_at                timestamptz NOT NULL DEFAULT now(),
  UNIQUE (derived_receipt_id)
);

CREATE INDEX IF NOT EXISTS reusable_eligibility_derivations_source_idx
  ON public.reusable_eligibility_derivations (source_receipt_id);

CREATE INDEX IF NOT EXISTS reusable_eligibility_derivations_fact_idx
  ON public.reusable_eligibility_derivations (fact_id);

ALTER TABLE public.reusable_eligibility_derivations ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.revoke_derived_receipts_for_source(
  p_source_receipt_id text,
  p_reason_code text,
  p_changed_by text
) RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_row record;
  v_result jsonb;
  v_revoked int := 0;
  v_already int := 0;
BEGIN
  FOR v_row IN
    SELECT derived_receipt_id
    FROM public.reusable_eligibility_derivations
    WHERE source_receipt_id = p_source_receipt_id
  LOOP
    SELECT public.revoke_decision_receipt_atomic(
      v_row.derived_receipt_id,
      p_reason_code,
      p_changed_by,
      'derived:' || p_source_receipt_id || ':' || v_row.derived_receipt_id
    ) INTO v_result;

    IF coalesce((v_result->>'ok')::boolean, false) THEN
      IF coalesce((v_result->>'already_revoked')::boolean, false) THEN
        v_already := v_already + 1;
      ELSE
        v_revoked := v_revoked + 1;
      END IF;
    END IF;
  END LOOP;

  UPDATE public.reusable_eligibility_facts
  SET status = 'revoked',
      revoked_at = coalesce(revoked_at, now())
  WHERE source_receipt_id = p_source_receipt_id
    AND status <> 'revoked';

  RETURN jsonb_build_object(
    'ok', true,
    'derived_revoked', v_revoked,
    'derived_already_revoked', v_already
  );
END;
$$;
