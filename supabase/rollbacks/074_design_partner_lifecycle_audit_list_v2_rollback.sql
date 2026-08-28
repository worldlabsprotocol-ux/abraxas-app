-- FILE: supabase/rollbacks/074_design_partner_lifecycle_audit_list_v2_rollback.sql
-- EMERGENCY ROLLBACK ONLY — drops migration 074 list v2 RPC.
--
-- Does NOT roll back migrations 072 or 073.
-- Does NOT delete audit_events rows or change table privileges.

DROP FUNCTION IF EXISTS public.design_partner_lifecycle_audit_list_v2(
  uuid,
  integer,
  timestamptz,
  uuid
);
