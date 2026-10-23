-- 149_partner_membership_recovery_admin_approval.sql
-- Platform-operator ownership review — independent of founder recovery attestation.

begin;

create table if not exists public.abraxas_partner_membership_recovery_admin_approvals (
  approval_id    text        primary key,
  attestation_id text        not null,
  account_id     text        not null references public.abraxas_accounts(account_id) on delete cascade,
  partner_id     text        not null,
  application_id uuid        not null,
  approver_actor_id text     not null,
  ownership_basis text       not null check (ownership_basis in ('provisioning_review', 'sandbox_enrollment_match')),
  reason         text        not null,
  expires_at     timestamptz not null,
  consumed_at    timestamptz,
  created_at     timestamptz not null default now(),
  constraint abraxas_pmraa_account_format
    check (account_id ~ '^abx_ac_[0-9a-f]{32}$')
);

create index if not exists abraxas_pmraa_attestation_idx
  on public.abraxas_partner_membership_recovery_admin_approvals (attestation_id);

alter table public.abraxas_partner_membership_recovery_admin_approvals enable row level security;
revoke all on public.abraxas_partner_membership_recovery_admin_approvals from public, anon, authenticated;
grant select, insert, update, delete on public.abraxas_partner_membership_recovery_admin_approvals to service_role;

create or replace function public.abraxas_consume_partner_membership_recovery_admin_approval(
  p_approval_id text,
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
  update public.abraxas_partner_membership_recovery_admin_approvals
     set consumed_at = pg_catalog.now()
   where approval_id = p_approval_id
     and attestation_id = p_attestation_id
     and account_id = p_account_id
     and partner_id = p_partner_id
     and application_id = p_application_id
     and consumed_at is null
     and expires_at > pg_catalog.now();

  get diagnostics v_updated = row_count;
  return v_updated = 1;
end;
$$;

revoke all on function public.abraxas_consume_partner_membership_recovery_admin_approval(text, text, text, text, uuid) from public;
grant execute on function public.abraxas_consume_partner_membership_recovery_admin_approval(text, text, text, text, uuid) to service_role;

commit;
