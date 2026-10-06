-- 113_decision_receipt_evidence_dependencies.sql
-- Internal receipt ↔ reusable evidence dependency records for current-validity evaluation.
-- Service role only. No raw evidence. Immutable audit trail.
--
-- Prerequisite: 093_reusable_eligibility_facts.sql, 033_decision_receipts.sql
-- OPERATOR: apply manually in Supabase SQL editor when ready.

CREATE TABLE IF NOT EXISTS public.decision_receipt_evidence_dependencies (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id            text        NOT NULL REFERENCES public.decision_receipts(id) ON DELETE RESTRICT,
  fact_id               text        REFERENCES public.reusable_eligibility_facts(id) ON DELETE RESTRICT,
  source_credential_id  text,
  dependency_type       text        NOT NULL
                        CHECK (dependency_type IN ('reusable_fact', 'source_receipt', 'derived_from')),
  created_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (receipt_id, dependency_type)
);

CREATE INDEX IF NOT EXISTS decision_receipt_evidence_dependencies_receipt_idx
  ON public.decision_receipt_evidence_dependencies (receipt_id);

CREATE INDEX IF NOT EXISTS decision_receipt_evidence_dependencies_source_idx
  ON public.decision_receipt_evidence_dependencies (source_credential_id)
  WHERE source_credential_id IS NOT NULL;

ALTER TABLE public.decision_receipt_evidence_dependencies ENABLE ROW LEVEL SECURITY;
