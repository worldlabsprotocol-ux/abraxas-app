-- FILE: supabase/migrations/039_partner_onboarding.sql
-- Design partner review + relying party onboarding fields.

ALTER TABLE public.design_partners
  ADD COLUMN IF NOT EXISTS promoted_partner_id TEXT,
  ADD COLUMN IF NOT EXISTS reviewer_notes TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

ALTER TABLE public.partners
  ADD COLUMN IF NOT EXISTS is_external BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS onboarding_checklist JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS public_listing_ok BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS design_partners_promoted_idx
  ON public.design_partners (promoted_partner_id)
  WHERE promoted_partner_id IS NOT NULL;
