-- 142_passport_institutional_authorization_commits.sql
-- Build #568: idempotent issuer-backed institutional authorization commits.

begin;

create table if not exists public.passport_institutional_authorization_commits (
  idempotency_key     text        primary key,
  holder_subject_id   text        not null,
  consent_id          text        not null,
  challenge_id        text        not null,
  credential_id       text        not null,
  partner_id          text        not null,
  policy_id           text        not null,
  request_id          text        not null,
  receipt_json        text,
  presentation_json   text,
  committed_at        timestamptz,
  created_at          timestamptz not null default now()
);

create index if not exists passport_institutional_authorization_commits_holder_idx
  on public.passport_institutional_authorization_commits (holder_subject_id, created_at desc);

comment on table public.passport_institutional_authorization_commits is
  'Durable idempotency and recovery for issuer-backed institutional authorization commits.';

alter table public.passport_institutional_authorization_commits enable row level security;

commit;
