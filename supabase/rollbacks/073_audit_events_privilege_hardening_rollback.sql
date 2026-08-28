-- FILE: supabase/rollbacks/073_audit_events_privilege_hardening_rollback.sql
-- SECURITY-DEGRADING EMERGENCY ROLLBACK ONLY — not routine operations.
--
-- Restores the pre-073 Production audit_events table ACL drift captured during
-- privilege reconciliation planning (broad grants on PUBLIC, anon, authenticated,
-- and service_role including UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER).
--
-- Requires explicit operator approval before use.
-- Does NOT delete audit_events rows.
-- Does NOT roll back migration 072 or its functions.
-- Does NOT revoke migration 073 by itself — run only when emergency compatibility
-- with pre-073 ACL posture is required.

REVOKE ALL PRIVILEGES ON TABLE public.audit_events FROM PUBLIC;
REVOKE ALL PRIVILEGES ON TABLE public.audit_events FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public.audit_events FROM authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.audit_events FROM service_role;

GRANT ALL ON TABLE public.audit_events TO PUBLIC;
GRANT ALL ON TABLE public.audit_events TO anon;
GRANT ALL ON TABLE public.audit_events TO authenticated;
GRANT ALL ON TABLE public.audit_events TO service_role;
