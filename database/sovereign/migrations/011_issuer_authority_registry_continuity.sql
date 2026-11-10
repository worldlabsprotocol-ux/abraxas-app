-- Issuer authority registry continuity.
-- A version identifies an authorized authority state. It does not advance per receipt.
-- Distinct from sovereign_receipt_status_checkpoints.status_version.

begin;

create table if not exists public.issuer_authority_registry_continuity (
  environment text not null check (environment in ('demo', 'production')),
  registry_version integer not null check (registry_version >= 854),
  authority_state_digest text not null check (char_length(authority_state_digest) = 64),
  anchor_key_id text not null,
  supersedes_registry_version integer,
  recorded_at timestamptz not null default now(),
  primary key (environment, registry_version),
  unique (environment, authority_state_digest),
  check (supersedes_registry_version is null or supersedes_registry_version < registry_version)
);

comment on table public.issuer_authority_registry_continuity is
  'Current and historical issuer authority states. Version advances only for an approved authority change.';

commit;
