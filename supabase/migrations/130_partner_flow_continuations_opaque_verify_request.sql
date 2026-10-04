-- FILE: supabase/migrations/130_partner_flow_continuations_opaque_verify_request.sql
-- Hosted handoff opaque capability tokens (vr_*) must not be coerced into verify_request_id uuid.
-- verify_request_id remains the durable link to verification_requests.id only.
-- Idempotent. Safe on DEMO and Production.

ALTER TABLE public.partner_flow_continuations
  ADD COLUMN IF NOT EXISTS opaque_verify_request text;

COMMENT ON COLUMN public.partner_flow_continuations.verify_request_id IS
  'UUID foreign key to verification_requests.id for evaluate/OAuth resume flows. Not hosted handoff vr_* tokens.';

COMMENT ON COLUMN public.partner_flow_continuations.opaque_verify_request IS
  'Opaque hosted handoff capability reference (vr_*). Mutually exclusive with verify_request_id.';

CREATE UNIQUE INDEX IF NOT EXISTS idx_partner_flow_continuations_opaque_verify_request
  ON public.partner_flow_continuations (opaque_verify_request)
  WHERE opaque_verify_request IS NOT NULL;
