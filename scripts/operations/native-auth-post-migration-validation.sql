-- Post-migration validation for Production native auth (144 + 145).
-- Run on project bztwutzprwsdrtqdpymf only after authorized apply.
-- Non-destructive read-only checks except RPC probe with fake challenge id.

-- 1) Tables exist
select
  to_regclass('public.abraxas_accounts') is not null as has_accounts,
  to_regclass('public.abraxas_account_passkeys') is not null as has_passkeys,
  to_regclass('public.abraxas_webauthn_challenges') is not null as has_challenges,
  to_regclass('public.abraxas_account_partner_memberships') is not null as has_memberships,
  to_regclass('public.abraxas_sandbox_enrollments') is not null as has_enrollments;

-- 2) RLS enabled on native tables
select c.relname as table_name, c.relrowsecurity as rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in (
    'abraxas_accounts',
    'abraxas_account_passkeys',
    'abraxas_webauthn_challenges',
    'abraxas_account_partner_memberships',
    'abraxas_account_partner_membership_grants',
    'abraxas_account_holder_bindings',
    'abraxas_sandbox_enrollments'
  )
order by 1;

-- 3) Membership status column (145)
select exists (
  select 1 from information_schema.columns
  where table_schema = 'public'
    and table_name = 'abraxas_account_partner_memberships'
    and column_name = 'status'
) as membership_status_column;

-- 4) Enrollment uniqueness index (145)
select exists (
  select 1 from pg_indexes
  where schemaname = 'public'
    and indexname = 'abraxas_sandbox_enrollments_account_partner_uq'
) as enrollment_partner_unique_index;

-- 5) Atomic RPC (145) — expect JSON ok:false for missing challenge, not an exception
select public.abraxas_consume_webauthn_challenge_atomic('__validation_probe__') as rpc_probe;
