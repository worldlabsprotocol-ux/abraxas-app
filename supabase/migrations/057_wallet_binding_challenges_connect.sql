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

-- Rename legacy primary key column when 020 shape is still present.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'wallet_binding_challenges'
      and column_name = 'challenge_id'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'wallet_binding_challenges'
      and column_name = 'id'
  ) then
    alter table public.wallet_binding_challenges
      rename column challenge_id to id;
  end if;
end $$;

-- Add connect-era columns when table was created by 020 only.
alter table public.wallet_binding_challenges
  add column if not exists chain text,
  add column if not exists chain_id int,
  add column if not exists domain text,
  add column if not exists subject_id text;

-- Backfill Sui defaults for legacy rows.
update public.wallet_binding_challenges
set
  chain = coalesce(chain, 'sui'),
  domain = coalesce(domain, 'abraxas-app.vercel.app'),
  subject_id = coalesce(subject_id, wallet_address)
where chain is null
   or domain is null
   or subject_id is null;

alter table public.wallet_binding_challenges
  alter column chain set default 'sui';

alter table public.wallet_binding_challenges
  alter column domain set default 'abraxas-app.vercel.app';

-- Enforce NOT NULL when backfill completed (safe no-op if already set).
do $$
begin
  if not exists (
    select 1 from public.wallet_binding_challenges
    where chain is null or domain is null
  ) then
    alter table public.wallet_binding_challenges
      alter column chain set not null,
      alter column domain set not null;
  end if;
exception
  when others then
    raise notice 'wallet_binding_challenges: NOT NULL enforcement skipped — verify backfill';
end $$;
