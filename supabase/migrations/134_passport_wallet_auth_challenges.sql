-- 134_passport_wallet_auth_challenges.sql
-- Short-lived, single-use Passport wallet authentication challenges (holder login).
-- Propose for DEMO/staging review before Production apply.
-- Prerequisite: 036_connect_wallet_authority.sql (wallet_bindings pattern reference)

begin;

create table if not exists public.passport_wallet_auth_challenges (
  id                  text        primary key,
  wallet_address      text        not null,
  sui_network         text        not null,
  origin              text        not null,
  intended_action     text        not null,
  session_context_hash text       not null,
  nonce               text        not null,
  message             text        not null,
  expires_at          timestamptz not null,
  consumed_at         timestamptz,
  created_at          timestamptz not null default now(),
  constraint passport_wallet_auth_challenges_wallet_hex
    check (wallet_address ~ '^0x[0-9a-f]{64}$')
);

create unique index if not exists passport_wallet_auth_challenges_nonce_uq
  on public.passport_wallet_auth_challenges (nonce);

create index if not exists passport_wallet_auth_challenges_wallet_expires_idx
  on public.passport_wallet_auth_challenges (wallet_address, expires_at desc);

comment on table public.passport_wallet_auth_challenges is
  'Single-use Passport holder wallet sign-in challenges. Service role only.';

alter table public.passport_wallet_auth_challenges enable row level security;
revoke all on table public.passport_wallet_auth_challenges from public, anon, authenticated;
grant select, insert, update on table public.passport_wallet_auth_challenges to service_role;

create or replace function public.consume_passport_wallet_auth_challenge(
  p_challenge_id text,
  p_wallet_address text,
  p_session_context_hash text
)
returns public.passport_wallet_auth_challenges
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_row public.passport_wallet_auth_challenges;
  v_wallet text := lower(btrim(p_wallet_address));
  v_ctx text := lower(btrim(p_session_context_hash));
begin
  update public.passport_wallet_auth_challenges c
  set consumed_at = pg_catalog.now()
  where c.id = btrim(p_challenge_id)
    and c.consumed_at is null
    and c.expires_at > pg_catalog.now()
    and lower(c.wallet_address) = v_wallet
    and lower(c.session_context_hash) = v_ctx
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.consume_passport_wallet_auth_challenge(text, text, text) from public, anon, authenticated;
grant execute on function public.consume_passport_wallet_auth_challenge(text, text, text) to service_role;

commit;
