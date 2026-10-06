-- FILE: supabase/migrations/111_partner_integration_events.sql
-- Privacy-safe relying-party integration lifecycle events for operator/partner observability.

CREATE TABLE IF NOT EXISTS public.partner_integration_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  partner_id text NOT NULL,
  application_id uuid REFERENCES public.partner_launchpad_applications(id) ON DELETE SET NULL,
  environment text NOT NULL CHECK (environment IN ('sandbox', 'production')),
  event_type text NOT NULL,
  lifecycle_stage text NOT NULL,
  outcome text,
  partner_safe_reason text,
  request_id text,
  receipt_id text,
  policy_id text,
  policy_version integer,
  correlation_id text,
  handoff_ref text,
  latency_ms integer,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS partner_integration_events_app_idx
  ON public.partner_integration_events (application_id, created_at DESC);

CREATE INDEX IF NOT EXISTS partner_integration_events_request_idx
  ON public.partner_integration_events (request_id, created_at DESC)
  WHERE request_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS partner_integration_events_receipt_idx
  ON public.partner_integration_events (receipt_id, created_at DESC)
  WHERE receipt_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS partner_integration_events_partner_idx
  ON public.partner_integration_events (partner_id, created_at DESC);

ALTER TABLE public.partner_integration_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.partner_integration_events FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.partner_integration_events TO postgres, service_role;
