-- 152_decision_receipt_v1_1_signed_fields.sql
-- Dedicated persistence for receipt v1.1.0 signed fields (proposal — NOT applied in Build #845).
--
-- OPERATOR: apply manually in Supabase SQL editor only after founder authorization.
-- Prerequisite: 033_decision_receipts.sql, 151_decision_receipt_issuance_finalization.sql
--
-- Rollback (manual):
--   alter table public.decision_receipts
--     drop column if exists application_binding_ref,
--     drop column if exists evidence_commitment,
--     drop column if exists evidence_commitment_manifest,
--     drop column if exists v11_issuance_phase;

alter table public.decision_receipts
  add column if not exists application_binding_ref text,
  add column if not exists evidence_commitment jsonb,
  add column if not exists evidence_commitment_manifest jsonb,
  add column if not exists v11_issuance_phase text
    check (v11_issuance_phase is null or v11_issuance_phase in ('pending', 'final'));

comment on column public.decision_receipts.application_binding_ref is
  'Blinded application binding ref for schema 1.1.0; authoritative when present (sidecar is legacy interim).';
comment on column public.decision_receipts.evidence_commitment is
  'Signed evidence commitment digest object (abraxas.evidence_commitment/v1).';
comment on column public.decision_receipts.evidence_commitment_manifest is
  'Blinded evidence dependency manifest for portable export; must match commitment digest when final.';
comment on column public.decision_receipts.v11_issuance_phase is
  'v1.1.0 issuance phase when schema_version = 1.1.0; pending receipts are non-authorizable.';
