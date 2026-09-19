-- 090_circle_settlement_selection_replay.sql
-- Durable selection-token replay protection for Circle Arc testnet intents.
--
-- Preview/DEMO-first operator apply. Authorized first target: isolated demo
-- project ocntwbxarpjeixdnzide.
-- Additive and production-safe: hashed jti only, no raw selection tokens,
-- no extra receipt-id copies, service_role only, no secrets.
-- Do not auto-apply. Never store Circle API keys, entity secrets, private keys,
-- wallet-set secrets, raw provider payloads, raw selection tokens, or PII.
--
-- Abraxas is not a custodian of customer funds. An intent is not a payment.
-- Missing this column must fail closed in application code.
--
-- Prerequisite: 089_circle_arc_testnet_settlement.sql
-- This migration does NOT:
--   - enable production activation
--   - configure Circle credentials
--   - grant privileges to anon or authenticated
--
-- Idempotent: safe to re-run.

begin;

alter table public.partner_settlement_intents
  add column if not exists selection_jti_hash text;

comment on column public.partner_settlement_intents.selection_jti_hash is
  'SHA-256 hex of the selection-token jti. Never store the raw token or raw jti.';

create unique index if not exists partner_settlement_intents_selection_jti_hash_unique
  on public.partner_settlement_intents (selection_jti_hash)
  where selection_jti_hash is not null;

create unique index if not exists partner_settlement_intents_receipt_unique
  on public.partner_settlement_intents (application_id, receipt_id);

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
    coalesce(new.infrastructure_label, ''),
    coalesce(new.selection_jti_hash, '')
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
    or blob ~ 'eyj'
  then
    raise exception 'partner_settlement_intents: secret-shaped or raw payload value rejected';
  end if;

  if new.selection_jti_hash is null
    or new.selection_jti_hash !~ '^[a-f0-9]{64}$'
  then
    raise exception 'partner_settlement_intents: selection_jti_hash required';
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
      or old.selection_jti_hash is distinct from new.selection_jti_hash
      or old.created_at is distinct from new.created_at
    then
      raise exception 'partner_settlement_intents: identity columns are immutable';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_partner_settlement_intents_immutability
  on public.partner_settlement_intents;
create trigger trg_partner_settlement_intents_immutability
  before insert or update on public.partner_settlement_intents
  for each row execute function public.enforce_partner_settlement_intents_immutability();

alter table public.partner_settlement_intents enable row level security;
revoke all on public.partner_settlement_intents from public, anon, authenticated;
grant select, insert, update on public.partner_settlement_intents to service_role;

commit;
