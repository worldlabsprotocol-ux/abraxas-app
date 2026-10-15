-- 141_passport_institutional_presentation_consent.sql
-- Build #568: verifiable holder consent for institutional reusable credential presentation.
-- Propose for isolated sovereign Postgres review. Do not apply to shared staging or Production until approved.

begin;

create table if not exists public.passport_institutional_presentation_consents (
  consent_id          text        primary key,
  holder_subject_id   text        not null,
  credential_id       text        not null,
  partner_id          text        not null,
  policy_id           text        not null,
  policy_version      integer     not null,
  disclosure_hash     text        not null,
  created_at          timestamptz not null default now(),
  expires_at          timestamptz not null,
  consumed_at         timestamptz,
  constraint passport_institutional_consent_hash_len
    check (char_length(disclosure_hash) = 64)
);

create index if not exists passport_institutional_consent_holder_idx
  on public.passport_institutional_presentation_consents (holder_subject_id, created_at desc);

comment on table public.passport_institutional_presentation_consents is
  'Single-use holder consent bindings for institutional reusable credential presentation. No identity evidence stored.';

alter table public.passport_institutional_presentation_consents enable row level security;

commit;
