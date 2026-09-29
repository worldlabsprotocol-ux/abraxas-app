-- FILE: supabase/migrations/116_partner_application_policy_bindings.sql
-- Multi-policy bindings per Launchpad application (canonical extension of #495).
--
-- Prerequisites (must exist before apply):
--   084_partner_launchpad_foundation.sql
--   110_partner_launchpad_activate_production_atomic.sql (production_activated_at column)
--     — or 119_launchpad_production_schema_repair.sql on drifted databases
--
-- Primary policy remains on partner_launchpad_applications for production activation
-- and verifyForAction defaults. Secondary bindings are sandbox-configured until
-- explicit production authorization per binding.

CREATE TABLE IF NOT EXISTS public.partner_launchpad_application_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.partner_launchpad_applications(id) ON DELETE CASCADE,
  partner_id text NOT NULL,
  policy_id text NOT NULL,
  policy_version integer NOT NULL DEFAULT 1,
  policy_template_id text NOT NULL,
  binding_role text NOT NULL DEFAULT 'secondary'
    CHECK (binding_role IN ('primary', 'secondary')),
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'retired', 'pending_review')),
  sandbox_configured_at timestamptz NOT NULL DEFAULT now(),
  production_authorized_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (application_id, policy_id)
);

CREATE INDEX IF NOT EXISTS partner_launchpad_application_policies_app_idx
  ON public.partner_launchpad_application_policies (application_id);

CREATE INDEX IF NOT EXISTS partner_launchpad_application_policies_partner_idx
  ON public.partner_launchpad_application_policies (partner_id);

ALTER TABLE public.partner_launchpad_application_policies ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.partner_launchpad_application_policies FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.partner_launchpad_application_policies TO service_role;

-- Backfill primary bindings from existing applications.
INSERT INTO public.partner_launchpad_application_policies (
  application_id,
  partner_id,
  policy_id,
  policy_version,
  policy_template_id,
  binding_role,
  status,
  sandbox_configured_at,
  production_authorized_at,
  created_at,
  updated_at
)
SELECT
  a.id,
  a.partner_id,
  a.policy_id,
  a.policy_version,
  a.policy_template_id,
  'primary',
  'active',
  a.created_at,
  CASE WHEN a.environment = 'production' THEN a.production_activated_at ELSE NULL END,
  a.created_at,
  a.updated_at
FROM public.partner_launchpad_applications a
ON CONFLICT (application_id, policy_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.partner_launchpad_add_application_policy_atomic(
  p_application_id uuid,
  p_partner_id text,
  p_policy_template_id text,
  p_policy_id text,
  p_policy_rules jsonb,
  p_idempotency_key text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_app public.partner_launchpad_applications%ROWTYPE;
  v_existing public.partner_launchpad_application_policies%ROWTYPE;
  v_binding_id uuid;
  v_now timestamptz := pg_catalog.now();
BEGIN
  SELECT * INTO v_app
    FROM public.partner_launchpad_applications
   WHERE id = p_application_id
     AND partner_id = p_partner_id
   LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'application_not_found');
  END IF;

  IF p_policy_id IS NULL OR p_policy_template_id IS NULL OR p_policy_rules IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'invalid_input');
  END IF;

  IF p_policy_id = v_app.policy_id THEN
    RETURN jsonb_build_object('ok', false, 'code', 'policy_already_primary');
  END IF;

  SELECT * INTO v_existing
    FROM public.partner_launchpad_application_policies
   WHERE application_id = p_application_id
     AND policy_id = p_policy_id
   LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'ok', true,
      'code', 'idempotency_replay',
      'binding_id', v_existing.id,
      'policy_id', v_existing.policy_id,
      'policy_version', v_existing.policy_version,
      'policy_template_id', v_existing.policy_template_id,
      'binding_role', v_existing.binding_role
    );
  END IF;

  INSERT INTO public.partner_policies (
    id, version, partner_id, name, status, rules_json, updated_at
  ) VALUES (
    p_policy_id,
    1,
    p_partner_id,
    v_app.display_name || ' ' || p_policy_template_id,
    'active',
    p_policy_rules,
    v_now
  )
  ON CONFLICT (id, version) DO NOTHING;

  INSERT INTO public.partner_launchpad_application_policies (
    application_id,
    partner_id,
    policy_id,
    policy_version,
    policy_template_id,
    binding_role,
    status,
    sandbox_configured_at,
    updated_at
  ) VALUES (
    p_application_id,
    p_partner_id,
    p_policy_id,
    1,
    p_policy_template_id,
    'secondary',
    'active',
    v_now,
    v_now
  )
  RETURNING id INTO v_binding_id;

  INSERT INTO public.partner_launchpad_activity (
    application_id, partner_id, event_type, public_code, metadata
  ) VALUES (
    p_application_id,
    p_partner_id,
    'application_provisioned',
    'policy_binding_added',
    jsonb_build_object(
      'policy_id', p_policy_id,
      'policy_template_id', p_policy_template_id,
      'binding_role', 'secondary'
    )
  );

  RETURN jsonb_build_object(
    'ok', true,
    'code', 'policy_added',
    'binding_id', v_binding_id,
    'policy_id', p_policy_id,
    'policy_version', 1,
    'policy_template_id', p_policy_template_id,
    'binding_role', 'secondary'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.partner_launchpad_add_application_policy_atomic(uuid, text, text, text, jsonb, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.partner_launchpad_add_application_policy_atomic(uuid, text, text, text, jsonb, text) TO service_role;
