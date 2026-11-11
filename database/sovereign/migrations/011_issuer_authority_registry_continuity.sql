-- Issuer authority registry continuity.
-- A version identifies an authorized authority state. It does not advance per receipt.
-- Distinct from sovereign_receipt_status_checkpoints.status_version.
--
-- Backward compatible: adds one new table and does not alter existing tables.
-- Apply this file before the application build that reads it. Receipt issuance
-- fails closed while the table is absent. Do not apply it to Production from CI.
-- After the table exists, version 854 is recorded only by a signed
-- abraxas_issuer_authority_change/1.0.0 bootstrap authorization whose digest
-- matches the configured authority state and whose signature matches
-- ABRAXAS_ISSUER_AUTHORITY_ANCHOR_PUBLIC_JWK. That value is issuer
-- configuration. It is not a relying party's independently pinned trust root.
-- This file does not insert a row and does not install signing keys.

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
