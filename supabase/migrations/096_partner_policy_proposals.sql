-- FILE: supabase/migrations/096_partner_policy_proposals.sql
-- Partner policy proposals and operator planning records.
--
-- DEMO-first. Do not apply from Vercel or this PR.
-- A proposal never publishes a catalog pack or changes a live policy.
-- Service-role only. RLS enabled. No anon or authenticated grants.

CREATE TABLE IF NOT EXISTS public.partner_policy_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id text NOT NULL REFERENCES public.partners(partner_id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN (
    'draft',
    'submitted',
    'needs_information',
    'under_review',
    'accepted_for_policy_work',
    'declined'
  )),
  payload jsonb NOT NULL,
  payload_hash text NOT NULL CHECK (payload_hash ~ '^[a-f0-9]{64}$'),
  operator_note text,
  planning jsonb,
  history jsonb NOT NULL DEFAULT '[]'::jsonb,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS partner_policy_proposals_partner_idx
  ON public.partner_policy_proposals (partner_id, created_at DESC);

CREATE INDEX IF NOT EXISTS partner_policy_proposals_status_idx
  ON public.partner_policy_proposals (status, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS partner_policy_proposals_open_hash_idx
  ON public.partner_policy_proposals (partner_id, payload_hash)
  WHERE status IN ('submitted', 'needs_information', 'under_review', 'accepted_for_policy_work');

ALTER TABLE public.partner_policy_proposals ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.partner_policy_proposals FROM PUBLIC;
REVOKE ALL ON public.partner_policy_proposals FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.partner_policy_proposals TO postgres, service_role;
