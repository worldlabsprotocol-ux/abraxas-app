-- 136_passport_holder_subjects.sql
-- Chain-neutral Passport holder subjects and verified wallet account bindings.
-- Propose for review before Production apply. Reversible: drop new tables only; legacy tables untouched.

begin;

create table if not exists public.passport_holder_subjects (
  subject_id   text        primary key,
  created_at   timestamptz not null default now(),
  status       text        not null default 'active'
               check (status in ('active', 'suspended')),
  constraint passport_holder_subjects_id_format
    check (subject_id ~ '^abx_hs_[0-9a-f]{32}$')
);

comment on table public.passport_holder_subjects is
  'Abraxas-controlled chain-neutral Passport holder subject identifiers.';

create table if not exists public.passport_holder_wallet_accounts (
  id               text        primary key,
  subject_id       text        not null references public.passport_holder_subjects(subject_id),
  caip10           text        not null,
  chain_namespace  text        not null,
  chain_reference  text        not null,
  account_address  text        not null,
  auth_method      text        not null,
  verified_at      timestamptz not null default now(),
  constraint passport_holder_wallet_accounts_caip10_uq unique (caip10),
  constraint passport_holder_wallet_accounts_subject_caip_uq unique (subject_id, caip10)
);

create index if not exists passport_holder_wallet_accounts_subject_idx
  on public.passport_holder_wallet_accounts (subject_id);

comment on table public.passport_holder_wallet_accounts is
  'Cryptographically verified wallet accounts bound to a chain-neutral holder subject.';

create table if not exists public.passport_holder_legacy_links (
  subject_id    text        not null references public.passport_holder_subjects(subject_id),
  legacy_kind   text        not null,
  legacy_key    text        not null,
  linked_at     timestamptz not null default now(),
  primary key (legacy_kind, legacy_key)
);

create index if not exists passport_holder_legacy_links_subject_idx
  on public.passport_holder_legacy_links (subject_id);

comment on table public.passport_holder_legacy_links is
  'Explicit links from legacy identity keys (e.g. sui address, oauth sub) to holder subjects.';

create table if not exists public.passport_evm_auth_challenges (
  id                   text        primary key,
  wallet_address       text        not null,
  chain_id             int         not null,
  origin               text        not null,
  intended_action      text        not null,
  session_context_hash text        not null,
  nonce                text        not null,
  message              text        not null,
  expires_at           timestamptz not null,
  consumed_at          timestamptz,
  created_at           timestamptz not null default now()
);

create unique index if not exists passport_evm_auth_challenges_nonce_uq
  on public.passport_evm_auth_challenges (nonce);

create table if not exists public.passport_solana_auth_challenges (
  id                   text        primary key,
  wallet_address       text        not null,
  solana_network       text        not null,
  origin               text        not null,
  intended_action      text        not null,
  session_context_hash text        not null,
  nonce                text        not null,
  message              text        not null,
  expires_at           timestamptz not null,
  consumed_at          timestamptz,
  created_at           timestamptz not null default now()
);

create unique index if not exists passport_solana_auth_challenges_nonce_uq
  on public.passport_solana_auth_challenges (nonce);

alter table public.passport_holder_subjects enable row level security;
alter table public.passport_holder_wallet_accounts enable row level security;
alter table public.passport_holder_legacy_links enable row level security;
alter table public.passport_evm_auth_challenges enable row level security;
alter table public.passport_solana_auth_challenges enable row level security;

revoke all on table public.passport_holder_subjects from public, anon, authenticated;
revoke all on table public.passport_holder_wallet_accounts from public, anon, authenticated;
revoke all on table public.passport_holder_legacy_links from public, anon, authenticated;
revoke all on table public.passport_evm_auth_challenges from public, anon, authenticated;
revoke all on table public.passport_solana_auth_challenges from public, anon, authenticated;

grant select, insert, update on table public.passport_holder_subjects to service_role;
grant select, insert on table public.passport_holder_wallet_accounts to service_role;
grant select, insert on table public.passport_holder_legacy_links to service_role;
grant select, insert, update on table public.passport_evm_auth_challenges to service_role;
grant select, insert, update on table public.passport_solana_auth_challenges to service_role;

create or replace function public.consume_passport_evm_auth_challenge(
  p_challenge_id text,
  p_wallet_address text,
  p_session_context_hash text
)
returns public.passport_evm_auth_challenges
language plpgsql security definer set search_path = pg_catalog, public
as $$
declare v_row public.passport_evm_auth_challenges;
begin
  update public.passport_evm_auth_challenges c
  set consumed_at = pg_catalog.now()
  where c.id = btrim(p_challenge_id)
    and c.consumed_at is null
    and c.expires_at > pg_catalog.now()
    and lower(c.wallet_address) = lower(btrim(p_wallet_address))
    and lower(c.session_context_hash) = lower(btrim(p_session_context_hash))
  returning * into v_row;
  return v_row;
end;
$$;

create or replace function public.consume_passport_solana_auth_challenge(
  p_challenge_id text,
  p_wallet_address text,
  p_session_context_hash text
)
returns public.passport_solana_auth_challenges
language plpgsql security definer set search_path = pg_catalog, public
as $$
declare v_row public.passport_solana_auth_challenges;
begin
  update public.passport_solana_auth_challenges c
  set consumed_at = pg_catalog.now()
  where c.id = btrim(p_challenge_id)
    and c.consumed_at is null
    and c.expires_at > pg_catalog.now()
    and c.wallet_address = btrim(p_wallet_address)
    and lower(c.session_context_hash) = lower(btrim(p_session_context_hash))
  returning * into v_row;
  return v_row;
end;
$$;

revoke all on function public.consume_passport_evm_auth_challenge(text, text, text) from public, anon, authenticated;
grant execute on function public.consume_passport_evm_auth_challenge(text, text, text) to service_role;
revoke all on function public.consume_passport_solana_auth_challenge(text, text, text) from public, anon, authenticated;
grant execute on function public.consume_passport_solana_auth_challenge(text, text, text) to service_role;

alter table public.identity_verifications
  add column if not exists holder_subject_id text;

create index if not exists identity_verifications_holder_subject_idx
  on public.identity_verifications (holder_subject_id)
  where holder_subject_id is not null;

commit;
