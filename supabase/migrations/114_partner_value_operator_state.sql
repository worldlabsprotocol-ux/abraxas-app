-- 114_partner_value_operator_state.sql
-- Operator commercial/ICP/feature-request state for value evidence. No holder PII.
--
-- Prerequisite: 084_partner_launchpad_foundation.sql
-- OPERATOR: apply manually in Supabase SQL editor when ready.

CREATE TABLE IF NOT EXISTS public.partner_value_commercial_state (
  application_id            uuid        PRIMARY KEY
                            REFERENCES public.partner_launchpad_applications(id) ON DELETE CASCADE,
  partner_id                text        NOT NULL,
  design_partner_status     text        NOT NULL DEFAULT 'prospect'
                            CHECK (design_partner_status IN (
                              'prospect', 'design_partner', 'paused', 'declined', 'not_converted'
                            )),
  commercial_lifecycle_stage text       NOT NULL DEFAULT 'none'
                            CHECK (commercial_lifecycle_stage IN (
                              'none', 'commercial_review', 'converted'
                            )),
  commercial_model_candidate text
                            CHECK (commercial_model_candidate IS NULL OR commercial_model_candidate IN (
                              'platform_fee_plus_usage', 'annual_contract_plus_usage', 'usage_only',
                              'pilot_free', 'pilot_paid', 'custom_evaluation', 'undecided'
                            )),
  commercial_model_status   text
                            CHECK (commercial_model_status IS NULL OR commercial_model_status IN (
                              'evaluating', 'selected', 'rejected', 'undecided'
                            )),
  commercial_converted      boolean     NOT NULL DEFAULT false,
  commercial_declined       boolean     NOT NULL DEFAULT false,
  commercial_paused         boolean     NOT NULL DEFAULT false,
  effective_from            timestamptz,
  operator_actor            text,
  operator_note_reference   text,
  updated_at                timestamptz NOT NULL DEFAULT now(),
  created_at                timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS partner_value_commercial_state_partner_idx
  ON public.partner_value_commercial_state (partner_id);

CREATE TABLE IF NOT EXISTS public.partner_value_icp_profile (
  application_id            uuid        PRIMARY KEY
                            REFERENCES public.partner_launchpad_applications(id) ON DELETE CASCADE,
  partner_id                text        NOT NULL,
  industry_category         text,
  company_size_band         text
                            CHECK (company_size_band IS NULL OR company_size_band IN (
                              'startup', 'growth', 'enterprise', 'unknown'
                            )),
  primary_policy_need       text,
  integration_type          text
                            CHECK (integration_type IS NULL OR integration_type IN (
                              'hosted_partner_flow', 'server_verify', 'webhook', 'onchain_gate', 'other'
                            )),
  initial_use_case            text,
  technical_owner_type      text
                            CHECK (technical_owner_type IS NULL OR technical_owner_type IN (
                              'engineering', 'product', 'compliance', 'founder', 'other'
                            )),
  compliance_driver         text
                            CHECK (compliance_driver IS NULL OR compliance_driver IN (
                              'age_gate', 'residency', 'privacy', 'regulatory', 'other', 'none'
                            )),
  operator_actor            text,
  updated_at                timestamptz NOT NULL DEFAULT now(),
  created_at                timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.partner_value_feature_requests (
  id                        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id                text        NOT NULL,
  application_id            uuid        REFERENCES public.partner_launchpad_applications(id) ON DELETE SET NULL,
  title                     text        NOT NULL,
  classification            text        NOT NULL
                            CHECK (classification IN (
                              'core_platform', 'reusable_policy_capability', 'partner_configuration',
                              'custom_one_off', 'security_requirement', 'compliance_requirement'
                            )),
  reusable_across_market    text        NOT NULL DEFAULT 'unknown'
                            CHECK (reusable_across_market IN ('yes', 'no', 'unknown')),
  blocks_production         boolean     NOT NULL DEFAULT false,
  status                    text        NOT NULL DEFAULT 'open'
                            CHECK (status IN ('open', 'accepted', 'deferred', 'rejected', 'shipped')),
  requested_by_partner      text        NOT NULL,
  operator_actor            text,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS partner_value_feature_requests_partner_idx
  ON public.partner_value_feature_requests (partner_id, status);

CREATE TABLE IF NOT EXISTS public.partner_value_operator_audit (
  id                        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id            uuid        REFERENCES public.partner_launchpad_applications(id) ON DELETE SET NULL,
  partner_id                text        NOT NULL,
  event_type                text        NOT NULL,
  public_code               text,
  metadata                  jsonb       NOT NULL DEFAULT '{}'::jsonb,
  operator_actor            text,
  created_at                timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS partner_value_operator_audit_app_idx
  ON public.partner_value_operator_audit (application_id, created_at DESC);

ALTER TABLE public.partner_value_commercial_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_value_icp_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_value_feature_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_value_operator_audit ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.partner_value_commercial_state FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.partner_value_icp_profile FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.partner_value_feature_requests FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.partner_value_operator_audit FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_value_commercial_state TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_value_icp_profile TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_value_feature_requests TO service_role;
GRANT SELECT, INSERT ON public.partner_value_operator_audit TO service_role;
