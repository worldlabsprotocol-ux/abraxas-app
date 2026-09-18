-- 089_circle_arc_testnet_settlement.sql
-- Receipt-gated Circle Arc testnet USDC settlement intents.
--
-- Preview/DEMO-first operator apply. Authorized first target: isolated demo
-- project ocntwbxarpjeixdnzide.
-- Additive and production-safe: empty table, service_role only, no secrets.
-- Do not auto-apply. Never store Circle API keys, entity secrets, private keys,
-- wallet-set secrets, raw provider payloads, or wallet-private metadata.
--
-- Abraxas is not a custodian of customer funds. Rows record DEMO/testnet
-- infrastructure settlement intents. An intent is not a payment; state stays
-- pending until a Circle-authenticated provider result is applied.
--
-- Prerequisite: 084_partner_launchpad_foundation.sql
-- This migration does NOT:
--   - enable production activation
--   - configure Circle credentials
--   - grant privileges to anon or authenticated
--
-- Idempotent: safe to re-run.

begin;

create table if not exists public.partner_settlement_intents (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.partner_launchpad_applications(id) on delete cascade,
  partner_id text not null,
  idempotency_key uuid not null,
  state text not null default 'pending'
    check (state in ('pending', 'submitted', 'settled', 'failed', 'cancelled')),
  network text not null default 'ARC-TESTNET'
    check (network = 'ARC-TESTNET'),
  currency text not null default 'USDC'
    check (currency = 'USDC'),
  amount_minor bigint not null
    check (amount_minor > 0),
  receipt_id text not null,
  policy_id text not null,
  policy_version integer not null,
  provider_request_ref text,
  circle_transaction_id text,
  provider_state text
    check (
      provider_state is null
      or provider_state in (
        'INITIATED',
        'CLEARED',
        'QUEUED',
        'SENT',
        'STUCK',
        'CONFIRMED',
        'COMPLETE',
        'FAILED',
        'DENIED',
        'CANCELLED'
      )
    ),
  provider_occurred_at timestamptz,
  infrastructure_label text not null
    default 'DEMO/testnet settlement wallet — test infrastructure only',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (idempotency_key)
);

create unique index if not exists partner_settlement_intents_receipt_unique
  on public.partner_settlement_intents (application_id, receipt_id);

create unique index if not exists partner_settlement_intents_circle_tx_unique
  on public.partner_settlement_intents (circle_transaction_id)
  where circle_transaction_id is not null;

create index if not exists partner_settlement_intents_app_idx
  on public.partner_settlement_intents (application_id, created_at desc);

create or replace function public.enforce_partner_settlement_intents_immutability()
returns trigger
language plpgsql
as $$
declare
  blob text;
begin
  blob := lower(concat_ws(' ',
    coalesce(new.partner_id, ''),
    coalesce(new.receipt_id, ''),
    coalesce(new.policy_id, ''),
    coalesce(new.provider_request_ref, ''),
    coalesce(new.circle_transaction_id, ''),
    coalesce(new.provider_state, ''),
    coalesce(new.infrastructure_label, '')
  ));
  if blob ~ 'api[_-]?key'
    or blob ~ 'entity[_-]?secret'
    or blob ~ 'private[_-]?key'
    or blob ~ 'wallet[_-]?set[_-]?secret'
    or blob ~ 'raw[_-]?payload'
    or blob ~ 'begin private'
    or blob ~ 'bearer '
    or blob ~ 'live_api_key'
    or blob ~ 'test_api_key'
    or blob ~ 'ciphertext'
  then
    raise exception 'partner_settlement_intents: secret-shaped or raw payload value rejected';
  end if;

  if tg_op = 'UPDATE' then
    if old.state in ('settled', 'failed', 'cancelled') then
      raise exception 'partner_settlement_intents: terminal intents are immutable';
    end if;
    if old.application_id is distinct from new.application_id
      or old.partner_id is distinct from new.partner_id
      or old.idempotency_key is distinct from new.idempotency_key
      or old.receipt_id is distinct from new.receipt_id
      or old.amount_minor is distinct from new.amount_minor
      or old.network is distinct from new.network
      or old.currency is distinct from new.currency
      or old.policy_id is distinct from new.policy_id
      or old.policy_version is distinct from new.policy_version
      or old.created_at is distinct from new.created_at
    then
      raise exception 'partner_settlement_intents: identity columns are immutable';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_partner_settlement_intents_settled_immutable
  on public.partner_settlement_intents;
drop trigger if exists trg_partner_settlement_intents_immutability
  on public.partner_settlement_intents;
create trigger trg_partner_settlement_intents_immutability
  before insert or update on public.partner_settlement_intents
  for each row execute function public.enforce_partner_settlement_intents_immutability();

alter table public.partner_settlement_intents enable row level security;
revoke all on public.partner_settlement_intents from public, anon, authenticated;
grant select, insert, update on public.partner_settlement_intents to service_role;

commit;
