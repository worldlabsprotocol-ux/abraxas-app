-- FILE: supabase/migrations/097_policy_release_candidates.sql
-- Operator policy release candidates.
--
-- DEMO-first. Do not apply from Vercel or this PR.
-- A candidate never publishes a catalog pack or changes a live policy.
-- Service-role only. RLS enabled. No anon or authenticated grants.

CREATE TABLE IF NOT EXISTS public.partner_policy_release_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES public.partner_policy_proposals(id) ON DELETE CASCADE,
  partner_id text NOT NULL REFERENCES public.partners(partner_id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN (
    'draft',
    'ready_for_review',
    'needs_revision',
    'approved_for_catalog_pr',
    'superseded'
  )),
  shape jsonb NOT NULL,
  shape_hash text NOT NULL CHECK (shape_hash ~ '^[a-f0-9]{64}$'),
  operator_note text,
  history jsonb NOT NULL DEFAULT '[]'::jsonb,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS partner_policy_release_candidates_proposal_idx
  ON public.partner_policy_release_candidates (proposal_id, created_at DESC);

CREATE INDEX IF NOT EXISTS partner_policy_release_candidates_status_idx
  ON public.partner_policy_release_candidates (status, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS partner_policy_release_candidates_open_hash_idx
  ON public.partner_policy_release_candidates (proposal_id, shape_hash)
  WHERE status <> 'superseded';

ALTER TABLE public.partner_policy_release_candidates ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.partner_policy_release_candidates FROM PUBLIC;
REVOKE ALL ON public.partner_policy_release_candidates FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.partner_policy_release_candidates TO postgres, service_role;
