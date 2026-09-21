-- FILE: supabase/migrations/099_hosted_partner_flow_handoffs.sql
-- DEMO-first Hosted Partner Flow handoff records and nonce hashes.
-- Do not apply from Vercel or this PR.
-- Service-role only. RLS enabled. Fail closed if absent.

CREATE TABLE IF NOT EXISTS public.hosted_partner_flow_handoffs (
  id uuid PRIMARY KEY,
  handoff_ref text NOT NULL UNIQUE,
  verify_request text NOT NULL UNIQUE,
  application_id uuid NOT NULL,
  partner_id text NOT NULL,
  policy_id text NOT NULL,
  policy_version integer NOT NULL,
  action text NOT NULL,
  purpose text NOT NULL,
  callback_ref text NOT NULL,
  runtime text NOT NULL,
  environment text NOT NULL CHECK (environment IN ('sandbox', 'production')),
  status text NOT NULL CHECK (status IN ('created', 'completed', 'cancelled', 'expired', 'consumed')),
  nonce_hash text NOT NULL,
  issued_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  public_receipt_id text,
  fixture boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS hosted_partner_flow_handoffs_partner_idx
  ON public.hosted_partner_flow_handoffs (partner_id, application_id, issued_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS hosted_partner_flow_handoffs_nonce_idx
  ON public.hosted_partner_flow_handoffs (nonce_hash);

ALTER TABLE public.hosted_partner_flow_handoffs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.hosted_partner_flow_handoffs FROM PUBLIC;
REVOKE ALL ON public.hosted_partner_flow_handoffs FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.hosted_partner_flow_handoffs TO postgres, service_role;
