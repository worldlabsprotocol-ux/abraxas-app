-- 134_holder_wallet_login.sql
-- Wallet-first holder accounts (Solana login) — separate from Sui zkLogin subject.
-- Non-destructive: legacy sui_zklogin_identities unchanged.

create extension if not exists "pgcrypto";

create table if not exists public.holder_wallet_accounts (
  id                uuid        primary key default gen_random_uuid(),
  solana_address    text        not null,
  linked_sui_address text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint holder_wallet_accounts_solana_unique unique (solana_address)
);

create index if not exists idx_holder_wallet_accounts_linked_sui
  on public.holder_wallet_accounts (linked_sui_address)
  where linked_sui_address is not null;

comment on table public.holder_wallet_accounts is
  'Solana wallet login identity. linked_sui_address is optional explicit link to legacy Passport subject — never auto-merged.';

create table if not exists public.holder_wallet_login_challenges (
  id               text        primary key,
  solana_address   text        not null,
  message          text        not null,
  domain           text        not null,
  environment      text        not null default 'unknown',
  nonce            text        not null,
  continue_path    text,
  expires_at       timestamptz not null,
  consumed_at      timestamptz,
  created_at       timestamptz not null default now()
);

create index if not exists idx_holder_wallet_login_challenges_wallet
  on public.holder_wallet_login_challenges (solana_address, expires_at desc);

comment on table public.holder_wallet_login_challenges is
  'One-time Solana sign-in challenges (SIWS-style). consumed_at set atomically on verify.';

do $$
begin
  if to_regclass('public.holder_wallet_accounts') is not null then
    grant select, insert, update on table public.holder_wallet_accounts to service_role;
  end if;
  if to_regclass('public.holder_wallet_login_challenges') is not null then
    grant select, insert, update on table public.holder_wallet_login_challenges to service_role;
  end if;
end $$;
