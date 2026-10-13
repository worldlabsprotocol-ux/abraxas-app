-- 135_passport_wallet_login_grants.sql
-- Explicit dual-control grants allowing wallet login for legacy OAuth/hosted Passport rows.
-- Does not merge or delete legacy identity records. Propose for DEMO/staging before Production.

begin;

create table if not exists public.passport_wallet_login_grants (
  sui_address         text        primary key,
  legacy_provider     text        not null,
  legacy_oauth_sub    text        not null,
  linked_at           timestamptz not null default now(),
  link_challenge_id   text,
  constraint passport_wallet_login_grants_wallet_hex
    check (sui_address ~ '^0x[0-9a-f]{64}$')
);

create index if not exists passport_wallet_login_grants_legacy_oauth_sub_idx
  on public.passport_wallet_login_grants (legacy_oauth_sub);

comment on table public.passport_wallet_login_grants is
  'Holder-approved wallet login grant for an existing legacy Passport identity at the same Sui address.';

alter table public.passport_wallet_login_grants enable row level security;
revoke all on table public.passport_wallet_login_grants from public, anon, authenticated;
grant select, insert on table public.passport_wallet_login_grants to service_role;

commit;
