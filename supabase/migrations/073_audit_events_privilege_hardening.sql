-- FILE: supabase/migrations/073_audit_events_privilege_hardening.sql
-- Phase 1: reconcile public.audit_events table ACLs to least-privilege baseline.
--
-- Preserves service_role SELECT temporarily for appendAuditEvent insert-return and
-- direct admin receipt / partner-flow trace reads until Phase 2+3 RPC migrations land.
-- Does not mutate rows, change ownership, disable RLS, add policies, or alter indexes.
-- Does not roll back or modify migration 072 functions.
--
-- OPERATOR: apply manually after review. Production application is a separate gate.

REVOKE ALL PRIVILEGES ON TABLE public.audit_events FROM PUBLIC;
REVOKE ALL PRIVILEGES ON TABLE public.audit_events FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public.audit_events FROM authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.audit_events FROM service_role;

GRANT INSERT, SELECT ON TABLE public.audit_events TO service_role;
