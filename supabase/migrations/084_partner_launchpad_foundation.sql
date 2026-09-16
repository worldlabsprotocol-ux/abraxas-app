-- FILE: supabase/migrations/084_partner_launchpad_foundation.sql
-- Partner Launchpad: self service applications, activity, production access requests.
--
-- Prerequisite: 025_partners_registry.sql, 024_partner_api_keys.sql, 018_policy_verification.sql
-- OPERATOR: apply manually after merge. Do not apply during PR validation.

CREATE TABLE IF NOT EXISTS public.partner_launchpad_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  public_slug text NOT NULL UNIQUE,
  partner_id text NOT NULL REFERENCES public.partners(partner_id) ON DELETE RESTRICT,
  application_name text NOT NULL,
  display_name text NOT NULL,
  environment text NOT NULL DEFAULT 'sandbox' CHECK (environment IN ('sandbox', 'production')),
  policy_id text NOT NULL,
  policy_version integer NOT NULL DEFAULT 1,
  policy_template_id text NOT NULL,
  allowed_return_urls text[] NOT NULL DEFAULT '{}'::text[],
  api_key_id uuid REFERENCES public.partner_api_keys(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'pending')),
  idempotency_key text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS partner_launchpad_applications_partner_idx
  ON public.partner_launchpad_applications (partner_id);

CREATE INDEX IF NOT EXISTS partner_launchpad_applications_slug_idx
  ON public.partner_launchpad_applications (public_slug);

CREATE TABLE IF NOT EXISTS public.partner_launchpad_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.partner_launchpad_applications(id) ON DELETE CASCADE,
  partner_id text NOT NULL,
  event_type text NOT NULL,
  public_code text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS partner_launchpad_activity_app_idx
  ON public.partner_launchpad_activity (application_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.partner_production_access_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.partner_launchpad_applications(id) ON DELETE CASCADE,
  partner_id text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  request_notes text,
  reviewer_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);

CREATE INDEX IF NOT EXISTS partner_production_access_requests_status_idx
  ON public.partner_production_access_requests (status, created_at DESC);

ALTER TABLE public.partner_launchpad_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_launchpad_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_production_access_requests ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.partner_launchpad_applications FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.partner_launchpad_activity FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.partner_production_access_requests FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_launchpad_applications TO service_role;
GRANT SELECT, INSERT ON public.partner_launchpad_activity TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.partner_production_access_requests TO service_role;

CREATE OR REPLACE FUNCTION public.partner_launchpad_provision_sandbox_atomic(
  p_application_name text,
  p_display_name text,
  p_partner_id text,
  p_public_slug text,
  p_policy_template_id text,
  p_policy_id text,
  p_policy_rules jsonb,
  p_return_url text,
  p_idempotency_key text,
  p_key_prefix text,
  p_key_hash text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_existing public.partner_launchpad_applications%ROWTYPE;
  v_partner_exists boolean;
  v_key_id uuid;
  v_app_id uuid;
  v_now timestamptz := pg_catalog.now();
  v_id_pattern constant text := '^[a-z0-9][a-z0-9_-]{0,127}$';
  v_slug_pattern constant text := '^[a-z0-9][a-z0-9-]{2,62}$';
BEGIN
  IF p_idempotency_key IS NOT NULL AND btrim(p_idempotency_key) <> '' THEN
    SELECT * INTO v_existing
      FROM public.partner_launchpad_applications
     WHERE idempotency_key = p_idempotency_key
     LIMIT 1;
    IF FOUND THEN
      RETURN jsonb_build_object(
        'ok', true,
        'code', 'idempotency_replay',
        'application_id', v_existing.id,
        'partner_id', v_existing.partner_id,
        'public_slug', v_existing.public_slug,
        'policy_id', v_existing.policy_id,
        'policy_version', v_existing.policy_version,
        'key_prefix', (
          SELECT key_prefix FROM public.partner_api_keys WHERE id = v_existing.api_key_id
        )
      );
    END IF;
  END IF;

  IF p_partner_id IS NULL OR p_partner_id !~ v_id_pattern THEN
    RETURN jsonb_build_object('ok', false, 'code', 'invalid_input');
  END IF;
  IF p_public_slug IS NULL OR p_public_slug !~ v_slug_pattern THEN
    RETURN jsonb_build_object('ok', false, 'code', 'invalid_input');
  END IF;
  IF p_key_prefix IS NULL OR length(p_key_prefix) <> 16 OR p_key_prefix !~ '^abx_test_[A-Za-z0-9_-]{7}$' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'invalid_input');
  END IF;
  IF p_key_hash IS NULL OR p_key_hash !~ '^[a-f0-9]{64}$' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'invalid_input');
  END IF;
  IF p_policy_rules IS NULL OR jsonb_typeof(p_policy_rules) <> 'object' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'invalid_input');
  END IF;

  SELECT EXISTS(SELECT 1 FROM public.partners WHERE partner_id = p_partner_id) INTO v_partner_exists;

  BEGIN
    IF NOT v_partner_exists THEN
      INSERT INTO public.partners (
        partner_id, company, status, allowed_environments, is_external, public_listing_ok, updated_at
      ) VALUES (
        p_partner_id,
        COALESCE(p_display_name, p_application_name),
        'pilot',
        ARRAY['sandbox']::text[],
        true,
        false,
        v_now
      );
    END IF;

    INSERT INTO public.partner_policies (
      id, version, partner_id, name, status, rules_json, updated_at
    ) VALUES (
      p_policy_id,
      1,
      p_partner_id,
      p_application_name || ' policy',
      'active',
      p_policy_rules,
      v_now
    )
    ON CONFLICT (id, version) DO NOTHING;

    UPDATE public.partners
       SET assigned_policy_id = p_policy_id,
           allowed_return_urls = (
             SELECT ARRAY(
               SELECT DISTINCT unnest(
                 COALESCE(allowed_return_urls, ARRAY[]::text[]) || ARRAY[p_return_url]
               )
             )
           ),
           updated_at = v_now
     WHERE partner_id = p_partner_id;

    INSERT INTO public.partner_api_keys (
      partner_id, display_name, key_prefix, key_hash, scopes
    ) VALUES (
      p_partner_id,
      p_display_name || ' sandbox',
      p_key_prefix,
      p_key_hash,
      ARRAY['verify:credential', 'verify:registry', 'webhooks:read']::text[]
    )
    RETURNING id INTO v_key_id;

    INSERT INTO public.partner_launchpad_applications (
      public_slug,
      partner_id,
      application_name,
      display_name,
      environment,
      policy_id,
      policy_version,
      policy_template_id,
      allowed_return_urls,
      api_key_id,
      status,
      idempotency_key,
      updated_at
    ) VALUES (
      p_public_slug,
      p_partner_id,
      p_application_name,
      p_display_name,
      'sandbox',
      p_policy_id,
      1,
      p_policy_template_id,
      ARRAY[p_return_url],
      v_key_id,
      'active',
      NULLIF(btrim(p_idempotency_key), ''),
      v_now
    )
    RETURNING id INTO v_app_id;

    INSERT INTO public.partner_launchpad_activity (
      application_id, partner_id, event_type, public_code, metadata
    ) VALUES (
      v_app_id,
      p_partner_id,
      'application_provisioned',
      'provisioned',
      jsonb_build_object('policy_template_id', p_policy_template_id, 'environment', 'sandbox')
    );

    RETURN jsonb_build_object(
      'ok', true,
      'code', 'ok',
      'application_id', v_app_id,
      'partner_id', p_partner_id,
      'public_slug', p_public_slug,
      'policy_id', p_policy_id,
      'policy_version', 1,
      'key_prefix', p_key_prefix,
      'api_key_id', v_key_id
    );
  EXCEPTION
    WHEN unique_violation THEN
      RETURN jsonb_build_object('ok', false, 'code', 'conflict');
    WHEN OTHERS THEN
      RAISE;
  END;
END;
$$;

REVOKE ALL ON FUNCTION public.partner_launchpad_provision_sandbox_atomic(
  text, text, text, text, text, text, jsonb, text, text, text, text
) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.partner_launchpad_provision_sandbox_atomic(
  text, text, text, text, text, text, jsonb, text, text, text, text
) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.partner_launchpad_provision_sandbox_atomic(
  text, text, text, text, text, text, jsonb, text, text, text, text
) TO postgres, service_role;
