-- FILE: supabase/migrations/112_decision_receipt_supersessions.sql
-- Explicit receipt supersession records. Immutable signed receipts stay; current validity fails closed.

CREATE TABLE IF NOT EXISTS public.decision_receipt_supersessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  superseded_receipt_id text NOT NULL UNIQUE
    REFERENCES public.decision_receipts(id) ON DELETE CASCADE,
  superseding_receipt_id text NOT NULL
    REFERENCES public.decision_receipts(id) ON DELETE CASCADE,
  partner_id text NOT NULL,
  policy_id text NOT NULL,
  policy_version integer NOT NULL,
  subject_pseudonym_id text,
  launchpad_application_id uuid
    REFERENCES public.partner_launchpad_applications(id) ON DELETE SET NULL,
  scope text NOT NULL CHECK (scope IN ('session_refresh', 'explicit_reissue')),
  superseded_at timestamptz NOT NULL DEFAULT pg_catalog.now()
);

CREATE INDEX IF NOT EXISTS decision_receipt_supersessions_partner_idx
  ON public.decision_receipt_supersessions (partner_id, policy_id, superseded_at DESC);

CREATE INDEX IF NOT EXISTS decision_receipt_supersessions_superseding_idx
  ON public.decision_receipt_supersessions (superseding_receipt_id);

ALTER TABLE public.decision_receipt_supersessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.decision_receipt_supersessions FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.decision_receipt_supersessions TO postgres, service_role;
