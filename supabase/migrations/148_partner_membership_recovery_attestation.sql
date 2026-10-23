-- 148_partner_membership_recovery_attestation.sql
-- One-time, server-issued attestations binding a native account session to a sandbox application recovery request.

begin;

create table if not exists public.abraxas_partner_membership_recovery_attestations (
  attestation_id text        primary key,
  account_id     text        not null references public.abraxas_accounts(account_id) on delete cascade,
  partner_id     text        not null,
  application_id uuid        not null,
  expires_at     timestamptz not null,
  consumed_at    timestamptz,
  created_at     timestamptz not null default now(),
  constraint abraxas_pmra_account_format
    check (account_id ~ '^abx_ac_[0-9a-f]{32}$')
);

create index if not exists abraxas_pmra_account_app_idx
  on public.abraxas_partner_membership_recovery_attestations (account_id, application_id);

comment on table public.abraxas_partner_membership_recovery_attestations is
  'Server-minted recovery attestations — consumed once when an admin invitation grant is applied.';

alter table public.abraxas_partner_membership_recovery_attestations enable row level security;
revoke all on public.abraxas_partner_membership_recovery_attestations from public, anon, authenticated;
grant select, insert, update, delete on public.abraxas_partner_membership_recovery_attestations to service_role;

create or replace function public.abraxas_consume_partner_membership_recovery_attestation(
  p_attestation_id text,
  p_account_id text,
  p_partner_id text,
  p_application_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_updated int;
begin
  update public.abraxas_partner_membership_recovery_attestations
     set consumed_at = pg_catalog.now()
   where attestation_id = p_attestation_id
     and account_id = p_account_id
     and partner_id = p_partner_id
     and application_id = p_application_id
     and consumed_at is null
     and expires_at > pg_catalog.now();

  get diagnostics v_updated = row_count;
  return v_updated = 1;
end;
$$;

revoke all on function public.abraxas_consume_partner_membership_recovery_attestation(text, text, text, uuid) from public;
grant execute on function public.abraxas_consume_partner_membership_recovery_attestation(text, text, text, uuid) to service_role;

commit;
