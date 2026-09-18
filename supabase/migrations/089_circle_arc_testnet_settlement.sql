-- 089_circle_arc_testnet_settlement.sql
-- Receipt-gated Circle Arc testnet USDC settlement intents.
--
-- Preview/DEMO-first operator apply. Authorized first target: isolated demo
-- project ocntwbxarpjeixdnzide.
-- Additive and production-safe: empty table, service_role only, no secrets.
-- Do not auto-apply. Never store Circle API keys, entity secrets, private keys,
-- wallet-set secrets, or raw provider payloads.
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
  idempotency_key text not null,
  state text not null default 'pending'
    check (state in ('pending', 'submitted', 'settled', 'failed')),
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
  provider_state text,
  provider_occurred_at timestamptz,
  infrastructure_label text not null
    default 'DEMO/testnet settlement wallet — test infrastructure only',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (application_id, idempotency_key)
);

create unique index if not exists partner_settlement_intents_receipt_unique
  on public.partner_settlement_intents (application_id, receipt_id);

create unique index if not exists partner_settlement_intents_circle_tx_unique
  on public.partner_settlement_intents (circle_transaction_id)
  where circle_transaction_id is not null;

create index if not exists partner_settlement_intents_app_idx
  on public.partner_settlement_intents (application_id, created_at desc);

create or replace function public.enforce_partner_settlement_intents_no_secret_payload()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' and old.state = 'settled' and new.state is distinct from old.state then
    raise exception 'partner_settlement_intents: settled intents are immutable';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_partner_settlement_intents_settled_immutable
  on public.partner_settlement_intents;
create trigger trg_partner_settlement_intents_settled_immutable
  before update on public.partner_settlement_intents
  for each row execute function public.enforce_partner_settlement_intents_no_secret_payload();

alter table public.partner_settlement_intents enable row level security;
revoke all on public.partner_settlement_intents from public, anon, authenticated;
grant select, insert, update on public.partner_settlement_intents to service_role;

commit;
