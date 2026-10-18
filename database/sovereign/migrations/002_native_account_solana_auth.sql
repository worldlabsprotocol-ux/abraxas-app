-- 146_native_account_solana_auth.sql
-- Solana wallet credentials and SIWS-compatible account sign-in challenges.

begin;

create table if not exists public.abraxas_account_solana_wallets (
  id               text        primary key,
  account_id       text        not null references public.abraxas_accounts(account_id) on delete cascade,
  wallet_address   text        not null,
  solana_network   text        not null,
  created_at       timestamptz not null default now(),
  last_used_at     timestamptz,
  revoked_at       timestamptz,
  constraint abraxas_account_solana_wallets_uq unique (wallet_address, solana_network)
);

create index if not exists abraxas_account_solana_wallets_account_idx
  on public.abraxas_account_solana_wallets (account_id);

comment on table public.abraxas_account_solana_wallets is
  'Solana wallet credentials linked to Abraxas native accounts — authentication only.';

create table if not exists public.abraxas_account_solana_auth_challenges (
  id                   text        primary key,
  wallet_address       text        not null,
  solana_network       text        not null,
  origin               text        not null,
  uri                  text        not null,
  request_id           text        not null,
  session_context_hash text        not null,
  nonce                text        not null,
  message              text        not null,
  expires_at           timestamptz not null,
  consumed_at          timestamptz,
  created_at           timestamptz not null default now(),
  constraint abraxas_account_solana_auth_challenges_nonce_uq unique (nonce)
);

create index if not exists abraxas_account_solana_auth_challenges_expires_idx
  on public.abraxas_account_solana_auth_challenges (expires_at);

comment on table public.abraxas_account_solana_auth_challenges is
  'Short-lived Solana sign-in challenges for Abraxas account sessions.';

revoke all on table public.abraxas_account_solana_wallets from public;
revoke all on table public.abraxas_account_solana_auth_challenges from public;
grant select, insert, update on table public.abraxas_account_solana_wallets to abraxas_runtime;
grant select, insert, update on table public.abraxas_account_solana_auth_challenges to abraxas_runtime;

create or replace function public.abraxas_consume_account_solana_challenge_atomic(
  p_challenge_id text,
  p_wallet_address text,
  p_session_context_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_row public.abraxas_account_solana_auth_challenges%rowtype;
begin
  update public.abraxas_account_solana_auth_challenges
     set consumed_at = pg_catalog.now()
   where id = p_challenge_id
     and consumed_at is null
     and expires_at > pg_catalog.now()
     and wallet_address = p_wallet_address
     and session_context_hash = p_session_context_hash
  returning * into v_row;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'challenge_unavailable');
  end if;

  return jsonb_build_object(
    'ok', true,
    'wallet_address', v_row.wallet_address,
    'solana_network', v_row.solana_network,
    'origin', v_row.origin,
    'uri', v_row.uri,
    'request_id', v_row.request_id,
    'nonce', v_row.nonce,
    'message', v_row.message,
    'expires_at', v_row.expires_at
  );
end;
$$;

revoke all on function public.abraxas_consume_account_solana_challenge_atomic(text, text, text) from public;
grant execute on function public.abraxas_consume_account_solana_challenge_atomic(text, text, text) to abraxas_runtime;

commit;
