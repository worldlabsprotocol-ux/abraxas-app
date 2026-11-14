-- Durable public governance trust pin. Do not apply to Production without founder approval.
-- Migration 011 may remain unapplied; this file does not insert pins or private keys.

begin;

create table if not exists public.issuer_governance_trust_pin (
  environment text not null primary key check (environment in ('demo', 'production')),
  governance_key_id text not null,
  public_jwk jsonb not null,
  public_key_fingerprint text not null check (char_length(public_key_fingerprint) = 64),
  operator_change_ticket text not null,
  established_at timestamptz not null default now(),
  distrusted_at timestamptz,
  distrust_reason text,
  check (distrusted_at is null or distrust_reason is not null)
);

create table if not exists public.issuer_governance_trust_events (
  id bigserial primary key,
  environment text not null check (environment in ('demo', 'production')),
  event_type text not null check (event_type in ('bootstrap', 'succession', 'distrust')),
  governance_key_id text not null,
  public_key_fingerprint text not null check (char_length(public_key_fingerprint) = 64),
  operator_change_ticket text,
  detail jsonb not null default '{}'::jsonb,
  recorded_at timestamptz not null default now()
);

create index if not exists issuer_governance_trust_events_environment_idx
  on public.issuer_governance_trust_events (environment, recorded_at);

do $$
begin
  create role abraxas_runtime noinherit;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create role abraxas_governance_operator noinherit;
exception
  when duplicate_object then null;
end $$;

alter table public.issuer_governance_trust_pin owner to current_user;
alter table public.issuer_governance_trust_events owner to current_user;

revoke all on table public.issuer_governance_trust_pin from public;
revoke all on table public.issuer_governance_trust_events from public;
revoke all on table public.issuer_governance_trust_pin from abraxas_runtime;
revoke all on table public.issuer_governance_trust_events from abraxas_runtime;

grant select on table public.issuer_governance_trust_pin to abraxas_runtime;
grant select on table public.issuer_governance_trust_events to abraxas_runtime;

revoke all on table public.issuer_governance_trust_pin from abraxas_governance_operator;
revoke all on table public.issuer_governance_trust_events from abraxas_governance_operator;
grant select, insert, update on table public.issuer_governance_trust_pin to abraxas_governance_operator;
grant select, insert on table public.issuer_governance_trust_events to abraxas_governance_operator;
grant usage, select on sequence public.issuer_governance_trust_events_id_seq to abraxas_governance_operator;

revoke abraxas_governance_operator from abraxas_runtime;
revoke abraxas_runtime from abraxas_governance_operator;

comment on table public.issuer_governance_trust_pin is
  'Current public governance verification pin. Writable only by abraxas_governance_operator, not abraxas_runtime.';

commit;
