-- 135_canonical_holder_accounts.sql
-- Canonical Abraxas holder ID (independent of wallet). Solana-native path.

create extension if not exists "pgcrypto";

create table if not exists public.holder_accounts (
  id                    text        primary key,
  claims_subject_key    text        not null,
  legacy_sui_address    text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint holder_accounts_claims_subject_unique unique (claims_subject_key)
);

create index if not exists idx_holder_accounts_legacy_sui
  on public.holder_accounts (legacy_sui_address)
  where legacy_sui_address is not null;

comment on table public.holder_accounts is
  'Canonical holder identity. claims_subject_key is stable credential/receipt subject (Sui-shaped compat key).';

alter table public.holder_wallet_accounts
  add column if not exists holder_account_id text references public.holder_accounts(id);

create index if not exists idx_holder_wallet_accounts_holder
  on public.holder_wallet_accounts (holder_account_id);

do $$
begin
  if to_regclass('public.holder_accounts') is not null then
    grant select, insert, update on table public.holder_accounts to service_role;
  end if;
end $$;
