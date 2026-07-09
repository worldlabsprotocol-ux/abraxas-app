-- 018_policy_verification_repair.sql
-- Run ONLY if migration 018 failed partway through.
-- Safe to run multiple times. Then re-run 018_policy_verification.sql.

-- Drop dependents first (only the 018 tables — does not touch abraxas_credentials)
drop table if exists public.audit_events cascade;
drop table if exists public.verification_decisions cascade;
drop table if exists public.consent_receipts cascade;
drop table if exists public.verification_requests cascade;
drop table if exists public.credential_claims cascade;
drop table if exists public.wallet_bindings cascade;
-- partner_policies: keep if policies were seeded; uncomment next line for full reset
-- drop table if exists public.partner_policies cascade;
