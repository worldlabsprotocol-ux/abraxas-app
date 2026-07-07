-- 020_identity_verification_state_machine.sql
-- Rich identity verification + credential status for Passport onboarding.

alter table public.identity_verifications
  add column if not exists identity_verification_status text,
  add column if not exists credential_status text,
  add column if not exists veriff_decision_id text,
  add column if not exists error_message text,
  add column if not exists last_verified_at timestamptz,
  add column if not exists credential_issued_at timestamptz;

create table if not exists public.identity_verification_events (
  id              uuid        primary key default gen_random_uuid(),
  sui_address     text        not null,
  from_status     text,
  to_status       text        not null,
  source          text        not null,
  veriff_session_id text,
  payload_hash    text,
  created_at      timestamptz not null default now()
);

create index if not exists idx_idv_events_sui
  on public.identity_verification_events (sui_address, created_at desc);

-- Wallet binding challenges (durable across serverless instances)
create table if not exists public.wallet_binding_challenges (
  challenge_id    text        primary key,
  wallet_address  text        not null,
  message         text        not null,
  expires_at      timestamptz not null,
  consumed_at     timestamptz,
  created_at      timestamptz not null default now()
);

create index if not exists idx_wallet_binding_challenges_wallet
  on public.wallet_binding_challenges (wallet_address, expires_at desc);

alter table public.identity_verification_events enable row level security;
alter table public.wallet_binding_challenges enable row level security;
