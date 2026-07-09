-- 011_veriff_session_id.sql — track Veriff session for decision polling

alter table public.identity_verifications
  add column if not exists veriff_session_id text;

create index if not exists idx_identity_verifications_veriff_session
  on public.identity_verifications (veriff_session_id);

-- Intent message challenges (Phase 3)
create table if not exists public.intent_challenges (
  id              uuid        primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  expires_at      timestamptz not null,
  sui_address     text        not null,
  message         text        not null,
  consumed_at     timestamptz,
  signature_b64   text,
  public_key_b64  text,
  verified        boolean     not null default false
);

create index if not exists intent_challenges_sui_idx on public.intent_challenges (sui_address);
create index if not exists intent_challenges_expires_idx on public.intent_challenges (expires_at);

alter table public.intent_challenges enable row level security;

alter table public.sui_zklogin_identities
  add column if not exists ephemeral_public_key text;
