-- 143_passport_authorization_signing_claim.sql
-- Build #568: canonical signing claim for institutional authorization commits.

begin;

alter table public.passport_institutional_authorization_commits
  add column if not exists signing_claim_token text,
  add column if not exists signing_claim_expires_at timestamptz;

comment on column public.passport_institutional_authorization_commits.signing_claim_token is
  'Ephemeral worker claim for canonical receipt signing. Cleared when receipt_json is persisted.';

commit;
