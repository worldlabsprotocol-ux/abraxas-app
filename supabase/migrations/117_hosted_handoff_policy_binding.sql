-- FILE: supabase/migrations/117_hosted_handoff_policy_binding.sql
-- Pin Hosted Partner Flow handoffs to application policy bindings (migration 116).

ALTER TABLE public.hosted_partner_flow_handoffs
  ADD COLUMN IF NOT EXISTS binding_id text,
  ADD COLUMN IF NOT EXISTS pack_id text,
  ADD COLUMN IF NOT EXISTS result_family text;

CREATE INDEX IF NOT EXISTS hosted_partner_flow_handoffs_binding_idx
  ON public.hosted_partner_flow_handoffs (application_id, binding_id)
  WHERE binding_id IS NOT NULL;
