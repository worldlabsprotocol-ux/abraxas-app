-- FILE: supabase/migrations/103_chain_attestation_signer_lifecycle.sql
-- DEMO-first chain-attestation signer registry and deployment signer-update records.
-- Apply DEMO first. Do not auto-apply from Vercel. Private keys never stored.

alter table public.onchain_gate_deployments
  drop constraint if exists onchain_gate_deployments_status_check;

alter table public.onchain_gate_deployments
  add constraint onchain_gate_deployments_status_check
  check (status in (
    'submitted',
    'verified_sandbox',
    'needs_correction',
    'production_review_required',
    'verified_production',
    'signer_update_required',
    'signer_revoked',
    'revoked'
  ));

create table if not exists public.chain_attestation_signers (
  signer_ref text not null primary key,
  key_id text not null,
  algorithm text not null
    check (algorithm in ('secp256k1', 'ed25519')),
  environment text not null
    check (environment in ('sandbox', 'production')),
  public_verifier text not null,
  fingerprint text not null
    check (fingerprint ~ '^0x[0-9a-f]{64}$'),
  allowed_networks text[] not null,
  allowed_gate_types text[] not null,
  schema_versions text[] not null,
  status text not null
    check (status in ('active', 'retiring', 'retired', 'revoked')),
  reason_class text not null,
  issued_at timestamptz not null,
  not_before timestamptz not null,
  expires_at timestamptz null,
  allow_historical_verification boolean not null default false,
  historical_verify_until timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists chain_attestation_signers_env_algo_key_uq
  on public.chain_attestation_signers (environment, algorithm, key_id);

comment on table public.chain_attestation_signers is
  'Public chain-attestation signer registry. Hashes and verifier material only. Private keys stay in environment.';

create table if not exists public.chain_attestation_signer_events (
  event_id text not null primary key,
  signer_ref text not null,
  key_id text not null,
  from_status text not null,
  to_status text not null,
  reason_class text not null,
  created_at timestamptz not null default now()
);

create index if not exists chain_attestation_signer_events_key_idx
  on public.chain_attestation_signer_events (key_id, created_at);

create table if not exists public.chain_attestation_signer_updates (
  update_ref text not null primary key,
  deployment_ref text not null,
  partner_id text not null,
  application_id text not null,
  gate_type text not null
    check (gate_type in ('evm', 'solana')),
  network_id text not null,
  required_key_ids text[] not null,
  public_verifiers jsonb not null default '[]'::jsonb,
  deadline timestamptz not null,
  status text not null
    check (status in ('signer_update_required', 'signer_revoked')),
  created_at timestamptz not null default now()
);

create unique index if not exists chain_attestation_signer_updates_open_uq
  on public.chain_attestation_signer_updates (deployment_ref, status);

comment on table public.chain_attestation_signer_updates is
  'Partner-facing signer update packages. Not a transaction. Never stores private keys or RPC URLs.';

alter table public.partner_webhook_outbox
  drop constraint if exists partner_webhook_outbox_event_type_check;

alter table public.partner_webhook_outbox
  add constraint partner_webhook_outbox_event_type_check
  check (event_type in (
    'partner.receipt.issued',
    'partner.receipt.revoked',
    'partner.access.revoked',
    'partner.credential.revoked',
    'partner.webhook.test',
    'receipt.issued',
    'receipt.expired',
    'receipt.expiring',
    'receipt.revoked',
    'receipt.invalidated',
    'decision.denied',
    'integration.health_changed'
  ));

alter table public.chain_attestation_signers enable row level security;
alter table public.chain_attestation_signer_events enable row level security;
alter table public.chain_attestation_signer_updates enable row level security;

revoke all on table public.chain_attestation_signers from public, anon, authenticated;
revoke all on table public.chain_attestation_signer_events from public, anon, authenticated;
revoke all on table public.chain_attestation_signer_updates from public, anon, authenticated;
grant select, insert, update on table public.chain_attestation_signers to service_role;
grant select, insert on table public.chain_attestation_signer_events to service_role;
grant select, insert, update on table public.chain_attestation_signer_updates to service_role;
