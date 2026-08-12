-- 065_service_role_runtime_grants.sql
-- Explicit service_role table grants for Abraxas server runtime paths.
--
-- Scope: general server-runtime privilege correction discovered through isolated
-- demo catalog validation. This file does not auto-apply on Vercel deployment.
-- Production Supabase application requires a separate reviewed operator decision.
-- Immediate authorized target after merge: isolated demo project ocntwbxarpjeixdnzide.
--
-- Context: Supabase projects with "Automatically expose new tables" disabled receive
-- RLS policies but no default table-level grants. PostgREST and server-side runtime
-- paths that use SUPABASE_SERVICE_ROLE_KEY still require explicit GRANTs before RLS.
--
-- This migration does NOT:
--   - enable automatic table exposure in the Supabase dashboard
--   - use GRANT ... ON ALL TABLES
--   - use ALTER DEFAULT PRIVILEGES
--   - grant DELETE, TRUNCATE, REFERENCES, or TRIGGER
--   - grant privileges to anon or authenticated
--   - revoke or alter existing privileges (GRANT USAGE ON SCHEMA public is idempotent)
--
-- Atomicity: one fixed PL/pgSQL DO block asserts role + tables, then executes only
-- hardcoded GRANT literals. Any failure rolls back every grant made by this block,
-- independent of the guarded demo migration runner's outer transaction.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_catalog.pg_roles
     WHERE rolname = 'service_role'
  ) THEN
    RAISE EXCEPTION '065_service_role_runtime_grants: role service_role does not exist';
  END IF;

  IF to_regclass('public.identity_verifications') IS NULL
     OR to_regclass('public.abraxas_credentials') IS NULL
     OR to_regclass('public.credential_claims') IS NULL
     OR to_regclass('public.wallet_bindings') IS NULL
     OR to_regclass('public.partner_policies') IS NULL
     OR to_regclass('public.partners') IS NULL
     OR to_regclass('public.verification_requests') IS NULL
     OR to_regclass('public.verification_decisions') IS NULL
     OR to_regclass('public.consent_receipts') IS NULL
     OR to_regclass('public.audit_events') IS NULL
     OR to_regclass('public.credential_issuers') IS NULL
     OR to_regclass('public.decision_receipts') IS NULL
     OR to_regclass('public.credential_status_events') IS NULL
     OR to_regclass('public.receipt_claim_dependencies') IS NULL
     OR to_regclass('public.partner_metering_events') IS NULL
     OR to_regclass('public.partner_entitlements') IS NULL
     OR to_regclass('public.partner_webhook_configs') IS NULL
     OR to_regclass('public.partner_webhook_outbox') IS NULL
     OR to_regclass('public.partner_webhook_delivery_attempts') IS NULL
     OR to_regclass('public.partner_api_keys') IS NULL
     OR to_regclass('public.partner_api_usage') IS NULL
     OR to_regclass('public.wallet_binding_challenges') IS NULL
     OR to_regclass('public.connect_authorization_requests') IS NULL
     OR to_regclass('public.sui_zklogin_identities') IS NULL
  THEN
    RAISE EXCEPTION '065_service_role_runtime_grants: one or more audited runtime tables are missing';
  END IF;

  GRANT USAGE ON SCHEMA public TO service_role;

  GRANT SELECT, INSERT, UPDATE ON TABLE public.identity_verifications TO service_role;
  GRANT SELECT, INSERT, UPDATE ON TABLE public.abraxas_credentials TO service_role;
  GRANT SELECT, INSERT, UPDATE ON TABLE public.credential_claims TO service_role;
  GRANT SELECT, INSERT, UPDATE ON TABLE public.wallet_bindings TO service_role;
  GRANT SELECT, INSERT, UPDATE ON TABLE public.partner_policies TO service_role;
  GRANT SELECT, INSERT, UPDATE ON TABLE public.partners TO service_role;
  GRANT SELECT, INSERT, UPDATE ON TABLE public.verification_requests TO service_role;
  GRANT SELECT, INSERT, UPDATE ON TABLE public.verification_decisions TO service_role;
  GRANT SELECT, INSERT ON TABLE public.consent_receipts TO service_role;
  GRANT INSERT ON TABLE public.audit_events TO service_role;
  GRANT SELECT ON TABLE public.credential_issuers TO service_role;
  GRANT SELECT, INSERT ON TABLE public.decision_receipts TO service_role;
  GRANT SELECT, INSERT ON TABLE public.credential_status_events TO service_role;
  GRANT SELECT, INSERT, UPDATE ON TABLE public.receipt_claim_dependencies TO service_role;
  GRANT SELECT, INSERT ON TABLE public.partner_metering_events TO service_role;
  GRANT SELECT, INSERT, UPDATE ON TABLE public.partner_entitlements TO service_role;
  GRANT SELECT, INSERT, UPDATE ON TABLE public.partner_webhook_configs TO service_role;
  GRANT SELECT, INSERT, UPDATE ON TABLE public.partner_webhook_outbox TO service_role;
  GRANT SELECT, INSERT ON TABLE public.partner_webhook_delivery_attempts TO service_role;
  GRANT SELECT, INSERT, UPDATE ON TABLE public.partner_api_keys TO service_role;
  GRANT SELECT, INSERT ON TABLE public.partner_api_usage TO service_role;
  GRANT SELECT, INSERT, UPDATE ON TABLE public.wallet_binding_challenges TO service_role;
  GRANT SELECT, INSERT, UPDATE ON TABLE public.connect_authorization_requests TO service_role;
  GRANT SELECT, INSERT, UPDATE ON TABLE public.sui_zklogin_identities TO service_role;
END
$$;
