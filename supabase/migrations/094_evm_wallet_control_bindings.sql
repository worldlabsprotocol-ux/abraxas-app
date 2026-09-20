-- 094_evm_wallet_control_bindings.sql
-- Durable EVM wallet-control challenges and action bindings.
--
-- Required on Production before this public EVM wallet-control feature is live.
-- Apply on isolated DEMO first, then Production, as separate operator steps.
-- Do not auto-apply from Vercel. Do not apply from this PR.
--
-- Service-role only. RLS enabled. No anon or authenticated grants.
-- Stores HMAC hashes, opaque refs, expiry/revocation, and audit-safe reason classes.
-- Never store raw addresses, public keys, signatures, message text, RPC data,
-- balances, transaction payloads, private keys, seed phrases, or provider metadata.
--
-- Prerequisite: pgcrypto (already required by 018).
-- Idempotent: safe to re-run.

begin;

create table if not exists public.evm_wallet_challenges (
  challenge_id text primary key,
  partner_id text not null,
  origin_hash text not null,
  policy_hash text not null,
  action_hash text not null,
  network_hash text not null,
  action_contract_nonce_hash text not null,
  nonce_hash text not null,
  message_hash text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  revoked_at timestamptz,
  reason_class text not null default 'issued',
  created_at timestamptz not null default now(),
  constraint evm_wallet_challenges_origin_hash_hex
    check (origin_hash ~ '^[a-f0-9]{64}$'),
  constraint evm_wallet_challenges_policy_hash_hex
    check (policy_hash ~ '^[a-f0-9]{64}$'),
  constraint evm_wallet_challenges_action_hash_hex
    check (action_hash ~ '^[a-f0-9]{64}$'),
  constraint evm_wallet_challenges_network_hash_hex
    check (network_hash ~ '^[a-f0-9]{64}$'),
  constraint evm_wallet_challenges_nonce_contract_hash_hex
    check (action_contract_nonce_hash ~ '^[a-f0-9]{64}$'),
  constraint evm_wallet_challenges_nonce_hash_hex
    check (nonce_hash ~ '^[a-f0-9]{64}$'),
  constraint evm_wallet_challenges_message_hash_hex
    check (message_hash ~ '^[a-f0-9]{64}$'),
  constraint evm_wallet_challenges_reason_class
    check (reason_class in ('issued', 'consumed', 'expired', 'replayed', 'revoked', 'invalid'))
);

create unique index if not exists evm_wallet_challenges_partner_nonce_uq
  on public.evm_wallet_challenges (partner_id, nonce_hash);

create unique index if not exists evm_wallet_challenges_partner_message_uq
  on public.evm_wallet_challenges (partner_id, message_hash);

create index if not exists evm_wallet_challenges_partner_expires_idx
  on public.evm_wallet_challenges (partner_id, expires_at);

create table if not exists public.evm_wallet_bindings (
  binding_ref text primary key,
  partner_id text not null,
  address_hash text not null,
  origin_hash text not null,
  policy_hash text not null,
  action_hash text not null,
  network_hash text not null,
  action_contract_nonce_hash text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  revoked_at timestamptz,
  reason_class text not null default 'bound',
  created_at timestamptz not null default now(),
  constraint evm_wallet_bindings_address_hash_hex
    check (address_hash ~ '^[a-f0-9]{64}$'),
  constraint evm_wallet_bindings_origin_hash_hex
    check (origin_hash ~ '^[a-f0-9]{64}$'),
  constraint evm_wallet_bindings_policy_hash_hex
    check (policy_hash ~ '^[a-f0-9]{64}$'),
  constraint evm_wallet_bindings_action_hash_hex
    check (action_hash ~ '^[a-f0-9]{64}$'),
  constraint evm_wallet_bindings_network_hash_hex
    check (network_hash ~ '^[a-f0-9]{64}$'),
  constraint evm_wallet_bindings_nonce_hash_hex
    check (action_contract_nonce_hash ~ '^[a-f0-9]{64}$'),
  constraint evm_wallet_bindings_reason_class
    check (reason_class in ('bound', 'consumed', 'expired', 'replayed', 'revoked', 'invalid'))
);

create unique index if not exists evm_wallet_bindings_partner_contract_addr_uq
  on public.evm_wallet_bindings (partner_id, action_contract_nonce_hash, address_hash);

create index if not exists evm_wallet_bindings_partner_expires_idx
  on public.evm_wallet_bindings (partner_id, expires_at);

comment on table public.evm_wallet_challenges is
  'Tenant-scoped EVM wallet-control challenges. Hashes only. Service role only.';
comment on table public.evm_wallet_bindings is
  'Opaque EVM address-to-action bindings. Hashed addresses only. Service role only.';

create or replace function public.reject_evm_wallet_secret_payload()
returns trigger
language plpgsql
as $$
declare
  blob text;
begin
  blob := lower(concat_ws(' ', coalesce(to_jsonb(new)::text, '')));
  if blob ~ 'private[_-]?key'
    or blob ~ 'seed phrase'
    or blob ~ 'secretkey'
    or blob ~ 'signature'
    or blob ~ 'wallet_address'
    or blob ~ '0x[a-f0-9]{40}'
    or blob ~ 'begin private'
    or blob ~ 'eyj'
  then
    raise exception 'evm_wallet_store: secret-shaped or raw wallet payload rejected';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_evm_wallet_challenges_no_secrets on public.evm_wallet_challenges;
create trigger trg_evm_wallet_challenges_no_secrets
  before insert or update on public.evm_wallet_challenges
  for each row execute function public.reject_evm_wallet_secret_payload();

drop trigger if exists trg_evm_wallet_bindings_no_secrets on public.evm_wallet_bindings;
create trigger trg_evm_wallet_bindings_no_secrets
  before insert or update on public.evm_wallet_bindings
  for each row execute function public.reject_evm_wallet_secret_payload();

create or replace function public.evm_wallet_consume_challenge(
  p_challenge_id text,
  p_partner_id text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  updated public.evm_wallet_challenges;
begin
  update public.evm_wallet_challenges
     set consumed_at = now(), reason_class = 'consumed'
   where challenge_id = p_challenge_id
     and partner_id = p_partner_id
     and consumed_at is null
     and revoked_at is null
     and expires_at > now()
   returning * into updated;

  if updated.challenge_id is null then
    if exists (
      select 1 from public.evm_wallet_challenges
       where challenge_id = p_challenge_id and partner_id = p_partner_id and consumed_at is not null
    ) then
      return jsonb_build_object('ok', false, 'code', 'replayed');
    end if;
    if exists (
      select 1 from public.evm_wallet_challenges
       where challenge_id = p_challenge_id and partner_id = p_partner_id and revoked_at is not null
    ) then
      return jsonb_build_object('ok', false, 'code', 'revoked');
    end if;
    if exists (
      select 1 from public.evm_wallet_challenges
       where challenge_id = p_challenge_id and partner_id = p_partner_id and expires_at <= now()
    ) then
      return jsonb_build_object('ok', false, 'code', 'expired');
    end if;
    return jsonb_build_object('ok', false, 'code', 'missing');
  end if;

  return jsonb_build_object(
    'ok', true,
    'code', 'consumed',
    'expires_at', updated.expires_at,
    'origin_hash', updated.origin_hash,
    'policy_hash', updated.policy_hash,
    'action_hash', updated.action_hash,
    'network_hash', updated.network_hash,
    'action_contract_nonce_hash', updated.action_contract_nonce_hash,
    'message_hash', updated.message_hash
  );
end;
$$;

create or replace function public.evm_wallet_consume_binding(
  p_binding_ref text,
  p_partner_id text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  updated public.evm_wallet_bindings;
begin
  update public.evm_wallet_bindings
     set consumed_at = now(), reason_class = 'consumed'
   where binding_ref = p_binding_ref
     and partner_id = p_partner_id
     and consumed_at is null
     and revoked_at is null
     and expires_at > now()
   returning * into updated;

  if updated.binding_ref is null then
    if exists (
      select 1 from public.evm_wallet_bindings
       where binding_ref = p_binding_ref and partner_id = p_partner_id and consumed_at is not null
    ) then
      return jsonb_build_object('ok', false, 'code', 'replayed');
    end if;
    if exists (
      select 1 from public.evm_wallet_bindings
       where binding_ref = p_binding_ref and partner_id = p_partner_id and revoked_at is not null
    ) then
      return jsonb_build_object('ok', false, 'code', 'revoked');
    end if;
    if exists (
      select 1 from public.evm_wallet_bindings
       where binding_ref = p_binding_ref and partner_id = p_partner_id and expires_at <= now()
    ) then
      return jsonb_build_object('ok', false, 'code', 'expired');
    end if;
    return jsonb_build_object('ok', false, 'code', 'missing');
  end if;

  return jsonb_build_object('ok', true, 'code', 'consumed', 'expires_at', updated.expires_at);
end;
$$;

create or replace function public.evm_wallet_revoke_binding(
  p_binding_ref text,
  p_partner_id text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  updated public.evm_wallet_bindings;
begin
  update public.evm_wallet_bindings
     set revoked_at = now(), reason_class = 'revoked'
   where binding_ref = p_binding_ref
     and partner_id = p_partner_id
     and revoked_at is null
   returning * into updated;

  if updated.binding_ref is null then
    return jsonb_build_object('ok', false, 'code', 'missing');
  end if;
  return jsonb_build_object('ok', true, 'code', 'revoked');
end;
$$;

alter table public.evm_wallet_challenges enable row level security;
alter table public.evm_wallet_bindings enable row level security;

revoke all on table public.evm_wallet_challenges from public, anon, authenticated;
revoke all on table public.evm_wallet_bindings from public, anon, authenticated;

grant select, insert, update on table public.evm_wallet_challenges to service_role;
grant select, insert, update on table public.evm_wallet_bindings to service_role;

revoke all on function public.evm_wallet_consume_challenge(text, text) from public, anon, authenticated;
revoke all on function public.evm_wallet_consume_binding(text, text) from public, anon, authenticated;
revoke all on function public.evm_wallet_revoke_binding(text, text) from public, anon, authenticated;

grant execute on function public.evm_wallet_consume_challenge(text, text) to service_role;
grant execute on function public.evm_wallet_consume_binding(text, text) to service_role;
grant execute on function public.evm_wallet_revoke_binding(text, text) to service_role;

commit;
