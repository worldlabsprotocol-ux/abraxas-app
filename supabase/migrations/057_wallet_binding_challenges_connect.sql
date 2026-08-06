-- 057_wallet_binding_challenges_connect.sql
-- Upgrade wallet_binding_challenges from 020 (challenge_id PK, no chain) to 036 connect shape.
--
-- PREFLIGHT (read-only — run before applying):
--   select column_name, data_type, is_nullable
--   from information_schema.columns
--   where table_schema = 'public' and table_name = 'wallet_binding_challenges'
--   order by ordinal_position;
--
--   select to_regclass('public.wallet_binding_challenges');
--
-- POST-MIGRATION:
--   select id, chain, domain, subject_id
--   from public.wallet_binding_challenges
--   order by created_at desc
--   limit 3;

-- Canonical production host for legacy row backfill when domain was never stored.
-- Runtime challenges use resolveConnectDomain() — not this constant directly.
do $$
declare
  canonical_domain constant text := 'abraxasworld.xyz';
  has_id boolean;
  has_challenge_id boolean;
  null_chain_count integer;
  null_domain_count integer;
begin
  if to_regclass('public.wallet_binding_challenges') is null then
    raise exception 'wallet_binding_challenges table is missing — apply migration 020 first';
  end if;

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'wallet_binding_challenges'
      and column_name = 'id'
  ) into has_id;

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'wallet_binding_challenges'
      and column_name = 'challenge_id'
  ) into has_challenge_id;

  if has_id and has_challenge_id then
    raise exception
      'wallet_binding_challenges has both id and challenge_id — stop and investigate before applying 057';
  end if;

  if has_challenge_id and not has_id then
    alter table public.wallet_binding_challenges
      rename column challenge_id to id;
  elsif not has_id and not has_challenge_id then
    raise exception
      'wallet_binding_challenges has neither id nor challenge_id — unexpected schema shape';
  end if;

  alter table public.wallet_binding_challenges
    add column if not exists chain text,
    add column if not exists chain_id int,
    add column if not exists domain text,
    add column if not exists subject_id text;

  update public.wallet_binding_challenges
  set
    chain = coalesce(chain, 'sui'),
    domain = coalesce(domain, canonical_domain),
    subject_id = coalesce(subject_id, wallet_address)
  where chain is null
     or domain is null
     or subject_id is null;

  select count(*) into null_chain_count
  from public.wallet_binding_challenges
  where chain is null;

  select count(*) into null_domain_count
  from public.wallet_binding_challenges
  where domain is null;

  if null_chain_count > 0 then
    raise exception
      'wallet_binding_challenges backfill incomplete: % row(s) still have null chain',
      null_chain_count;
  end if;

  if null_domain_count > 0 then
    raise exception
      'wallet_binding_challenges backfill incomplete: % row(s) still have null domain',
      null_domain_count;
  end if;

  alter table public.wallet_binding_challenges
    alter column chain set default 'sui';

  alter table public.wallet_binding_challenges
    alter column domain set default 'abraxasworld.xyz';

  alter table public.wallet_binding_challenges
    alter column chain set not null,
    alter column domain set not null;
end $$;
