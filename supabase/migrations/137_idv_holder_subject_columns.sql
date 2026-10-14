-- 137_idv_holder_subject_columns.sql
-- Chain-neutral Abraxas Verify: holder_subject_id on document/review/biometric tables.
-- Non-destructive; legacy sui_address rows unchanged.

alter table public.passport_documents
  add column if not exists holder_subject_id text;

create index if not exists idx_passport_documents_holder_subject
  on public.passport_documents (holder_subject_id, stamp_id, status)
  where holder_subject_id is not null;

alter table public.identity_review_sessions
  add column if not exists holder_subject_id text;

alter table public.identity_review_sessions
  alter column sui_address drop not null;

alter table public.identity_review_sessions
  drop constraint if exists identity_review_sessions_subject_anchor_chk;

alter table public.identity_review_sessions
  add constraint identity_review_sessions_subject_anchor_chk
  check (
    sui_address is not null
    or holder_subject_id is not null
  );

create index if not exists idx_identity_review_sessions_holder_subject
  on public.identity_review_sessions (holder_subject_id, review_status, created_at desc)
  where holder_subject_id is not null;

create unique index if not exists idx_identity_review_sessions_one_pending_flow_hs
  on public.identity_review_sessions (holder_subject_id, partner_id, verification_request_id)
  where review_status = 'pending'
    and holder_subject_id is not null
    and partner_id is not null
    and verification_request_id is not null;

create unique index if not exists idx_identity_review_sessions_one_pending_partner_hs
  on public.identity_review_sessions (holder_subject_id, partner_id)
  where review_status = 'pending'
    and holder_subject_id is not null
    and partner_id is not null
    and verification_request_id is null;

alter table public.identity_biometric_assessments
  add column if not exists holder_subject_id text;

alter table public.identity_biometric_assessments
  alter column sui_address drop not null;

alter table public.identity_biometric_assessments
  drop constraint if exists identity_biometric_assessments_subject_anchor_chk;

alter table public.identity_biometric_assessments
  add constraint identity_biometric_assessments_subject_anchor_chk
  check (
    sui_address is not null
    or holder_subject_id is not null
  );

create index if not exists idx_biometric_assessments_holder_subject
  on public.identity_biometric_assessments (holder_subject_id)
  where holder_subject_id is not null;
