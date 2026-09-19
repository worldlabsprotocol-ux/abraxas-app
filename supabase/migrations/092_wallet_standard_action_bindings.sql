-- 092_wallet_standard_action_bindings.sql
-- Durable Wallet Standard challenges, bindings, and venue action nonces.
--
-- Required on Production before this public Wallet Standard / venue preflight
-- feature is live. Apply on isolated DEMO first, then Production, as separate
-- operator steps. Do not auto-apply from Vercel.
--
-- Service-role only. RLS enabled. No anon or authenticated grants.
-- Stores HMAC hashes and opaque refs only. Never store signatures, private keys,
-- seed phrases, balances, trading history, transactions, or raw wallet addresses.
--
-- Prerequisite: none beyond pgcrypto (already required by 018).
-- Idempotent: safe to re-run.

begin;

create table if not exists public.wallet_standard_challenges (
  challenge_id text primary key,
  partner_id text not null,
  origin_hash text not null,
  action_contract_nonce_hash text not null,
  nonce_hash text not null,
  message_hash text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  constraint wallet_standard_challenges_origin_hash_hex
    check (origin_hash ~ '^[a-f0-9]{64}$'),
  constraint wallet_standard_challenges_action_hash_hex
    check (action_contract_nonce_hash ~ '^[a-f0-9]{64}$'),
  constraint wallet_standard_challenges_nonce_hash_hex
    check (nonce_hash ~ '^[a-f0-9]{64}$'),
  constraint wallet_standard_challenges_message_hash_hex
    check (message_hash ~ '^[a-f0-9]{64}$')
);

create unique index if not exists wallet_standard_challenges_partner_nonce_uq
  on public.wallet_standard_challenges (partner_id, nonce_hash);

create unique index if not exists wallet_standard_challenges_partner_message_uq
  on public.wallet_standard_challenges (partner_id, message_hash);

create index if not exists wallet_standard_challenges_partner_expires_idx
  on public.wallet_standard_challenges (partner_id, expires_at);

create table if not exists public.wallet_standard_bindings (
  binding_ref text primary key,
  partner_id text not null,
  action_contract_nonce_hash text not null,
  pubkey_hash text not null,
  origin_hash text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  constraint wallet_standard_bindings_action_hash_hex
    check (action_contract_nonce_hash ~ '^[a-f0-9]{64}$'),
  constraint wallet_standard_bindings_pubkey_hash_hex
    check (pubkey_hash ~ '^[a-f0-9]{64}$'),
  constraint wallet_standard_bindings_origin_hash_hex
    check (origin_hash ~ '^[a-f0-9]{64}$')
);

create unique index if not exists wallet_standard_bindings_partner_contract_key_uq
  on public.wallet_standard_bindings (partner_id, action_contract_nonce_hash, pubkey_hash);

create index if not exists wallet_standard_bindings_partner_expires_idx
  on public.wallet_standard_bindings (partner_id, expires_at);

create table if not exists public.partner_venue_action_nonces (
  id uuid primary key default gen_random_uuid(),
  partner_id text not null,
  nonce_hash text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz not null default now(),
  constraint partner_venue_action_nonces_hash_hex
    check (nonce_hash ~ '^[a-f0-9]{64}$')
);

create unique index if not exists partner_venue_action_nonces_partner_nonce_uq
  on public.partner_venue_action_nonces (partner_id, nonce_hash);

comment on table public.wallet_standard_challenges is
  'Tenant-scoped Wallet Standard challenges. Hashes only. Service role only.';
comment on table public.wallet_standard_bindings is
  'Opaque wallet-to-action bindings. Hashed public keys only. Service role only.';
comment on table public.partner_venue_action_nonces is
  'One-time venue action nonce consume log. Hashed nonces only. Service role only.';

create or replace function public.reject_wallet_standard_secret_payload()
returns trigger
language plpgsql
as $$
declare
  blob text;
begin
  blob := lower(concat_ws(' ',
    coalesce(to_jsonb(new)::text, '')
  ));
  if blob ~ 'private[_-]?key'
    or blob ~ 'seed phrase'
    or blob ~ 'secretkey'
    or blob ~ 'signature'
    or blob ~ 'wallet_address'
    or blob ~ 'trading_history'
    or blob ~ 'begin private'
    or blob ~ 'eyj'
  then
    raise exception 'wallet_standard_store: secret-shaped or raw wallet payload rejected';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_wallet_standard_challenges_no_secrets on public.wallet_standard_challenges;
create trigger trg_wallet_standard_challenges_no_secrets
  before insert or update on public.wallet_standard_challenges
  for each row execute function public.reject_wallet_standard_secret_payload();

drop trigger if exists trg_wallet_standard_bindings_no_secrets on public.wallet_standard_bindings;
create trigger trg_wallet_standard_bindings_no_secrets
  before insert or update on public.wallet_standard_bindings
  for each row execute function public.reject_wallet_standard_secret_payload();

drop trigger if exists trg_partner_venue_action_nonces_no_secrets on public.partner_venue_action_nonces;
create trigger trg_partner_venue_action_nonces_no_secrets
  before insert or update on public.partner_venue_action_nonces
  for each row execute function public.reject_wallet_standard_secret_payload();

create or replace function public.wallet_standard_consume_challenge(
  p_challenge_id text,
  p_partner_id text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  updated public.wallet_standard_challenges;
begin
  update public.wallet_standard_challenges
     set consumed_at = now()
   where challenge_id = p_challenge_id
     and partner_id = p_partner_id
     and consumed_at is null
     and revoked_at is null
     and expires_at > now()
   returning * into updated;

  if updated.challenge_id is null then
    if exists (
      select 1 from public.wallet_standard_challenges
       where challenge_id = p_challenge_id and partner_id = p_partner_id and consumed_at is not null
    ) then
      return jsonb_build_object('ok', false, 'code', 'replayed');
    end if;
    if exists (
      select 1 from public.wallet_standard_challenges
       where challenge_id = p_challenge_id and partner_id = p_partner_id and revoked_at is not null
    ) then
      return jsonb_build_object('ok', false, 'code', 'revoked');
    end if;
    if exists (
      select 1 from public.wallet_standard_challenges
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
    'action_contract_nonce_hash', updated.action_contract_nonce_hash,
    'message_hash', updated.message_hash
  );
end;
$$;

create or replace function public.wallet_standard_consume_binding(
  p_binding_ref text,
  p_partner_id text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  updated public.wallet_standard_bindings;
begin
  update public.wallet_standard_bindings
     set consumed_at = now()
   where binding_ref = p_binding_ref
     and partner_id = p_partner_id
     and consumed_at is null
     and revoked_at is null
     and expires_at > now()
   returning * into updated;

  if updated.binding_ref is null then
    if exists (
      select 1 from public.wallet_standard_bindings
       where binding_ref = p_binding_ref and partner_id = p_partner_id and consumed_at is not null
    ) then
      return jsonb_build_object('ok', false, 'code', 'replayed');
    end if;
    if exists (
      select 1 from public.wallet_standard_bindings
       where binding_ref = p_binding_ref and partner_id = p_partner_id and revoked_at is not null
    ) then
      return jsonb_build_object('ok', false, 'code', 'revoked');
    end if;
    if exists (
      select 1 from public.wallet_standard_bindings
       where binding_ref = p_binding_ref and partner_id = p_partner_id and expires_at <= now()
    ) then
      return jsonb_build_object('ok', false, 'code', 'expired');
    end if;
    return jsonb_build_object('ok', false, 'code', 'missing');
  end if;

  return jsonb_build_object('ok', true, 'code', 'consumed', 'expires_at', updated.expires_at);
end;
$$;

create or replace function public.wallet_standard_revoke_binding(
  p_binding_ref text,
  p_partner_id text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  updated public.wallet_standard_bindings;
begin
  update public.wallet_standard_bindings
     set revoked_at = now()
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

create or replace function public.venue_consume_action_nonce(
  p_partner_id text,
  p_nonce_hash text,
  p_expires_at timestamptz
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_expires_at <= now() then
    return jsonb_build_object('ok', false, 'code', 'expired');
  end if;

  begin
    insert into public.partner_venue_action_nonces (partner_id, nonce_hash, expires_at)
    values (p_partner_id, p_nonce_hash, p_expires_at);
    return jsonb_build_object('ok', true, 'code', 'consumed');
  exception
    when unique_violation then
      return jsonb_build_object('ok', false, 'code', 'replayed');
  end;
end;
$$;

alter table public.wallet_standard_challenges enable row level security;
alter table public.wallet_standard_bindings enable row level security;
alter table public.partner_venue_action_nonces enable row level security;

revoke all on table public.wallet_standard_challenges from public, anon, authenticated;
revoke all on table public.wallet_standard_bindings from public, anon, authenticated;
revoke all on table public.partner_venue_action_nonces from public, anon, authenticated;

grant select, insert, update on table public.wallet_standard_challenges to service_role;
grant select, insert, update on table public.wallet_standard_bindings to service_role;
grant select, insert, update on table public.partner_venue_action_nonces to service_role;

revoke all on function public.wallet_standard_consume_challenge(text, text) from public, anon, authenticated;
revoke all on function public.wallet_standard_consume_binding(text, text) from public, anon, authenticated;
revoke all on function public.wallet_standard_revoke_binding(text, text) from public, anon, authenticated;
revoke all on function public.venue_consume_action_nonce(text, text, timestamptz) from public, anon, authenticated;

grant execute on function public.wallet_standard_consume_challenge(text, text) to service_role;
grant execute on function public.wallet_standard_consume_binding(text, text) to service_role;
grant execute on function public.wallet_standard_revoke_binding(text, text) to service_role;
grant execute on function public.venue_consume_action_nonce(text, text, timestamptz) to service_role;

commit;
