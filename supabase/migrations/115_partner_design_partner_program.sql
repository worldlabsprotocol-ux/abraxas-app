-- 115_partner_design_partner_program.sql
-- Design Partner Program — structured operating agreement. No holder PII.
--
-- Prerequisite: 084_partner_launchpad_foundation.sql, 114_partner_value_operator_state.sql
-- OPERATOR: apply manually in Supabase SQL editor when ready.

CREATE TABLE IF NOT EXISTS public.partner_design_partner_program (
  application_id              uuid        PRIMARY KEY
                              REFERENCES public.partner_launchpad_applications(id) ON DELETE CASCADE,
  partner_id                  text        NOT NULL,
  program_status              text        NOT NULL DEFAULT 'candidate'
                              CHECK (program_status IN (
                                'candidate', 'accepted', 'integration', 'pilot_ready', 'pilot_live',
                                'pilot_complete', 'commercial_review', 'converted',
                                'paused', 'declined', 'not_converted'
                              )),
  entered_at                  timestamptz NOT NULL DEFAULT now(),
  target_decision_date        timestamptz,
  primary_use_case            text,
  initial_policy_pack         text,
  pilot_environment           text        NOT NULL DEFAULT 'sandbox'
                              CHECK (pilot_environment IN ('sandbox', 'production')),
  technical_owner_status      text
                              CHECK (technical_owner_status IS NULL OR technical_owner_status IN (
                                'unknown', 'assigned', 'engaged', 'blocked'
                              )),
  business_owner_status       text
                              CHECK (business_owner_status IS NULL OR business_owner_status IN (
                                'unknown', 'assigned', 'engaged', 'blocked'
                              )),
  pilot_started_at            timestamptz,
  pilot_completed_at          timestamptz,
  decision_status             text        NOT NULL DEFAULT 'pending'
                              CHECK (decision_status IN (
                                'pending', 'converted', 'not_converted', 'extended', 'paused'
                              )),
  decision_reason_codes       text[]      NOT NULL DEFAULT '{}'::text[],
  decision_operator_summary   text,
  decision_recorded_at        timestamptz,
  technical_outcome           text
                              CHECK (technical_outcome IS NULL OR technical_outcome IN (
                                'criteria_met', 'criteria_partially_met', 'criteria_not_met', 'insufficient_evidence'
                              )),
  operator_actor              text,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS partner_design_partner_program_partner_idx
  ON public.partner_design_partner_program (partner_id, program_status);

CREATE TABLE IF NOT EXISTS public.partner_design_partner_criteria (
  id                          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id              uuid        NOT NULL
                              REFERENCES public.partner_design_partner_program(application_id) ON DELETE CASCADE,
  partner_id                  text        NOT NULL,
  criterion_type              text        NOT NULL
                              CHECK (criterion_type IN (
                                'integration_completed', 'first_successful_verification',
                                'minimum_successful_verifications', 'verification_success_rate',
                                'evidence_reuse_observed', 'production_activation',
                                'policy_supported', 'privacy_requirement_satisfied',
                                'custom_operator_confirmed'
                              )),
  target                      jsonb       NOT NULL DEFAULT '{}'::jsonb,
  measurement_source          text        NOT NULL,
  operator_confirmed          boolean     NOT NULL DEFAULT false,
  operator_confirmed_at       timestamptz,
  created_at                  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS partner_design_partner_criteria_app_idx
  ON public.partner_design_partner_criteria (application_id);

CREATE TABLE IF NOT EXISTS public.partner_case_study_permissions (
  application_id              uuid        PRIMARY KEY
                              REFERENCES public.partner_design_partner_program(application_id) ON DELETE CASCADE,
  partner_id                  text        NOT NULL,
  company_name_permission     text        NOT NULL DEFAULT 'pending'
                              CHECK (company_name_permission IN ('pending', 'approved', 'denied')),
  quote_permission            text        NOT NULL DEFAULT 'pending'
                              CHECK (quote_permission IN ('pending', 'approved', 'denied')),
  metrics_permission          text        NOT NULL DEFAULT 'pending'
                              CHECK (metrics_permission IN ('pending', 'approved', 'denied')),
  logo_permission             text        NOT NULL DEFAULT 'pending'
                              CHECK (logo_permission IN ('pending', 'approved', 'denied')),
  public_case_study_permission text       NOT NULL DEFAULT 'pending'
                              CHECK (public_case_study_permission IN ('pending', 'approved', 'denied')),
  operator_actor              text,
  updated_at                  timestamptz NOT NULL DEFAULT now(),
  created_at                  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.partner_customer_reported_evidence (
  id                          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id              uuid        NOT NULL
                              REFERENCES public.partner_design_partner_program(application_id) ON DELETE CASCADE,
  partner_id                  text        NOT NULL,
  evidence_type               text        NOT NULL
                              CHECK (evidence_type IN (
                                'approved_quote', 'operational_impact', 'customer_experience_impact',
                                'compliance_privacy_value', 'customer_reported_problem'
                              )),
  safe_value                  text        NOT NULL,
  source_date                 date,
  permission_status           text        NOT NULL DEFAULT 'pending'
                              CHECK (permission_status IN ('pending', 'approved', 'denied')),
  safe_source_reference       text,
  operator_actor              text,
  created_at                  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS partner_customer_reported_evidence_app_idx
  ON public.partner_customer_reported_evidence (application_id, evidence_type);

ALTER TABLE public.partner_design_partner_program ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_design_partner_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_case_study_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_customer_reported_evidence ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.partner_design_partner_program FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.partner_design_partner_criteria FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.partner_case_study_permissions FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.partner_customer_reported_evidence FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_design_partner_program TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_design_partner_criteria TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_case_study_permissions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_customer_reported_evidence TO service_role;
