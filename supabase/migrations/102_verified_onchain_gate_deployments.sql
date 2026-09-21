-- FILE: supabase/migrations/102_verified_onchain_gate_deployments.sql
-- DEMO-first partner-owned onchain gate deployment registry.
-- Apply DEMO first. Do not auto-apply from Vercel. Registration never deploys or funds a gate.

create table if not exists public.onchain_gate_deployments (
  deployment_ref text not null primary key,
  partner_id text not null,
  application_id text not null,
  gate_type text not null
    check (gate_type in ('evm', 'solana')),
  network_id text not null,
  chain_id bigint null,
  gate_address text null,
  bytecode_hash text null,
  config_digest text not null,
  program_id text null,
  gate_config_pda text null,
  program_digest text null,
  partner_hash text not null,
  policy_hash text not null,
  action_hash text not null,
  action_type text not null,
  action_scope text not null,
  environment text not null
    check (environment in ('sandbox', 'production')),
  signer_key_id text not null,
  subject_binding_mode text not null
    check (subject_binding_mode in ('not_attached', 'optional', 'required')),
  status text not null
    check (status in (
      'submitted',
      'verified_sandbox',
      'needs_correction',
      'production_review_required',
      'verified_production',
      'revoked'
    )),
  production_reviewed_at timestamptz null,
  revoked_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint onchain_gate_deployments_hash_hex
    check (
      config_digest ~ '^0x[0-9a-f]{64}$'
      and partner_hash ~ '^0x[0-9a-f]{64}$'
      and policy_hash ~ '^0x[0-9a-f]{64}$'
      and action_hash ~ '^0x[0-9a-f]{64}$'
      and (bytecode_hash is null or bytecode_hash ~ '^0x[0-9a-f]{64}$')
      and (program_digest is null or program_digest ~ '^0x[0-9a-f]{64}$')
    ),
  constraint onchain_gate_deployments_evm_shape
    check (
      gate_type <> 'evm'
      or (
        chain_id is not null
        and gate_address is not null
        and bytecode_hash is not null
        and program_id is null
        and gate_config_pda is null
        and program_digest is null
      )
    ),
  constraint onchain_gate_deployments_solana_shape
    check (
      gate_type <> 'solana'
      or (
        chain_id is null
        and gate_address is null
        and bytecode_hash is null
        and program_id is not null
        and gate_config_pda is not null
        and program_digest is not null
      )
    )
);

create unique index if not exists onchain_gate_deployments_identity_uq
  on public.onchain_gate_deployments (
    partner_id,
    application_id,
    gate_type,
    network_id,
    coalesce(lower(gate_address), ''),
    coalesce(program_id, ''),
    coalesce(gate_config_pda, '')
  );

create index if not exists onchain_gate_deployments_partner_app_idx
  on public.onchain_gate_deployments (partner_id, application_id);

comment on table public.onchain_gate_deployments is
  'Partner-owned EVM/Solana gate deployment registry. Opaque refs. Hashes and public identities only. Not a deployer.';

create table if not exists public.onchain_gate_deployment_events (
  event_id text not null primary key,
  deployment_ref text not null,
  partner_id text not null,
  application_id text not null,
  from_status text not null,
  to_status text not null,
  reason text not null,
  created_at timestamptz not null default now()
);

create index if not exists onchain_gate_deployment_events_ref_idx
  on public.onchain_gate_deployment_events (deployment_ref, created_at);

comment on table public.onchain_gate_deployment_events is
  'Durable lifecycle audit for verified onchain gate deployments. No RPC URLs, keys, receipts, or transaction payloads.';

alter table public.onchain_gate_deployments enable row level security;
alter table public.onchain_gate_deployment_events enable row level security;

revoke all on table public.onchain_gate_deployments from public, anon, authenticated;
revoke all on table public.onchain_gate_deployment_events from public, anon, authenticated;
grant select, insert, update on table public.onchain_gate_deployments to service_role;
grant select, insert on table public.onchain_gate_deployment_events to service_role;
