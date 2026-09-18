-- Automated partner-owned domain verification for Launchpad production activation.
-- Apply to DEMO first. This migration does not change MAIN or production configuration.

CREATE TABLE IF NOT EXISTS public.partner_launchpad_domain_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.partner_launchpad_applications(id) ON DELETE CASCADE,
  partner_id text NOT NULL REFERENCES public.partners(partner_id) ON DELETE CASCADE,
  hostname text NOT NULL,
  challenge_token text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'expired', 'failed')),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  verified_at timestamptz,
  last_checked_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (application_id, hostname)
);

CREATE INDEX IF NOT EXISTS partner_launchpad_domain_verifications_app_idx
  ON public.partner_launchpad_domain_verifications (application_id, status);

ALTER TABLE public.partner_launchpad_domain_verifications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.partner_launchpad_domain_verifications FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_launchpad_domain_verifications TO service_role;
