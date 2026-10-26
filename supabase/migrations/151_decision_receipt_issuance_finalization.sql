-- 151_decision_receipt_issuance_finalization.sql
-- Staged issuance: receipts are not authorizable until evidence finalization completes.
--
-- OPERATOR: apply manually in Supabase SQL editor when ready (founder-gated for Production).
-- Prerequisite: 033_decision_receipts.sql

alter table public.decision_receipts
  add column if not exists issuance_finalized_at timestamptz;

alter table public.decision_receipts
  drop constraint if exists decision_receipts_status_check;

alter table public.decision_receipts
  add constraint decision_receipts_status_check
  check (status in ('active', 'expired', 'revoked', 'pending_finalization'));

update public.decision_receipts
set issuance_finalized_at = coalesce(issuance_finalized_at, evaluated_at, created_at)
where status in ('active', 'expired', 'revoked');
