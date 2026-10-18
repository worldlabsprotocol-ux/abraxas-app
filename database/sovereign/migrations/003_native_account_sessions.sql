-- 147_native_account_sessions.sql
-- Server-enforced native account session registry (revocation + validation).

begin;

create table if not exists public.abraxas_account_sessions (
  session_id     text        primary key,
  account_id     text        not null references public.abraxas_accounts(account_id) on delete cascade,
  auth_method    text        not null check (auth_method in ('passkey', 'solana_wallet')),
  issued_at      timestamptz not null default now(),
  expires_at     timestamptz not null,
  revoked_at     timestamptz,
  revoke_reason  text,
  constraint abraxas_account_sessions_id_format
    check (session_id ~ '^acs_[0-9a-f]{32}$')
);

create index if not exists abraxas_account_sessions_account_idx
  on public.abraxas_account_sessions (account_id, issued_at desc);

create index if not exists abraxas_account_sessions_expires_idx
  on public.abraxas_account_sessions (expires_at);

comment on table public.abraxas_account_sessions is
  'Active and revoked Abraxas account browser sessions — JWT jti must match session_id.';

revoke all on table public.abraxas_account_sessions from public;
grant select, insert, update on table public.abraxas_account_sessions to abraxas_runtime;

create or replace function public.abraxas_validate_account_session(
  p_session_id text,
  p_account_id text
)
returns boolean
language sql
security definer
set search_path = pg_catalog, public
stable
as $$
  select exists (
    select 1
      from public.abraxas_account_sessions s
     where s.session_id = p_session_id
       and s.account_id = p_account_id
       and s.revoked_at is null
       and s.expires_at > pg_catalog.now()
  );
$$;

create or replace function public.abraxas_revoke_account_session(
  p_session_id text,
  p_account_id text,
  p_reason text default 'sign_out'
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_updated int;
begin
  update public.abraxas_account_sessions
     set revoked_at = pg_catalog.now(),
         revoke_reason = coalesce(nullif(trim(p_reason), ''), 'sign_out')
   where session_id = p_session_id
     and account_id = p_account_id
     and revoked_at is null;
  get diagnostics v_updated = row_count;
  return v_updated > 0;
end;
$$;

revoke all on function public.abraxas_validate_account_session(text, text) from public;
revoke all on function public.abraxas_revoke_account_session(text, text, text) from public;
grant execute on function public.abraxas_validate_account_session(text, text) to abraxas_runtime;
grant execute on function public.abraxas_revoke_account_session(text, text, text) to abraxas_runtime;

commit;
