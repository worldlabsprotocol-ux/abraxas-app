-- FILE: supabase/migrations/086_partner_launchpad_provision_schema_fix.sql
-- Launchpad provision RPC schema compatibility.
--
-- Prerequisite: 084 + 085 applied.
-- Fixes partner_policies INSERT that referenced non-existent updated_at (018 schema uses created_at).
-- Ensures partners.is_external/public_listing_ok exist (039) for greenfield/demo databases that skipped 039.

ALTER TABLE public.partners
  ADD COLUMN IF NOT EXISTS is_external BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS public_listing_ok BOOLEAN NOT NULL DEFAULT false;

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
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext('launchpad_provision:' || COALESCE(p_partner_id, '') || ':' || COALESCE(p_public_slug, ''))
  );

  IF p_idempotency_key IS NOT NULL AND btrim(p_idempotency_key) <> '' THEN
    SELECT * INTO v_existing
      FROM public.partner_launchpad_applications
     WHERE idempotency_key = p_idempotency_key
     LIMIT 1;
    IF FOUND THEN
      IF v_existing.partner_id <> p_partner_id THEN
        RETURN jsonb_build_object('ok', false, 'code', 'invalid_input');
      END IF;
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
        ),
        'api_key_id', v_existing.api_key_id
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
      id, version, partner_id, name, status, rules_json
    ) VALUES (
      p_policy_id,
      1,
      p_partner_id,
      p_application_name || ' policy',
      'active',
      p_policy_rules
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
