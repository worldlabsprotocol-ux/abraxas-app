-- FILE: supabase/migrations/132_partner_flow_continuation_ensure_by_opaque.sql
-- Atomic opaque hosted-handoff continuation resolution (#565).
-- Replaces fragile peek-then-insert-then-recover-peek when PostgREST peek returns zero rows
-- while the unique index proves the row exists.
-- Idempotent. Safe on DEMO and Production.

CREATE OR REPLACE FUNCTION public.ensure_partner_flow_continuation_by_opaque(
  p_opaque text,
  p_jti text,
  p_partner_id text,
  p_policy_id text,
  p_policy_version integer,
  p_return_url text,
  p_expires_at timestamptz,
  p_created_at timestamptz,
  p_permission text DEFAULT NULL,
  p_permission_version text DEFAULT NULL,
  p_purpose text DEFAULT NULL,
  p_app_slug text DEFAULT NULL
)
RETURNS TABLE (
  was_created boolean,
  jti text,
  partner_id text,
  policy_id text,
  policy_version integer,
  return_url text,
  permission text,
  permission_version text,
  purpose text,
  app_slug text,
  verify_request_id uuid,
  consumed_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz,
  opaque_verify_request text
)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_opaque text := btrim(p_opaque);
BEGIN
  IF v_opaque IS NULL OR v_opaque = '' THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH inserted AS (
    INSERT INTO public.partner_flow_continuations AS c (
      jti,
      partner_id,
      policy_id,
      policy_version,
      return_url,
      permission,
      permission_version,
      purpose,
      app_slug,
      verify_request_id,
      opaque_verify_request,
      consumed_at,
      expires_at,
      created_at
    )
    VALUES (
      p_jti,
      p_partner_id,
      p_policy_id,
      p_policy_version,
      p_return_url,
      p_permission,
      p_permission_version,
      p_purpose,
      p_app_slug,
      NULL,
      v_opaque,
      NULL,
      p_expires_at,
      p_created_at
    )
    ON CONFLICT (opaque_verify_request) WHERE opaque_verify_request IS NOT NULL
    DO NOTHING
    RETURNING
      true AS was_created,
      c.jti,
      c.partner_id,
      c.policy_id,
      c.policy_version,
      c.return_url,
      c.permission,
      c.permission_version,
      c.purpose,
      c.app_slug,
      c.verify_request_id,
      c.consumed_at,
      c.expires_at,
      c.created_at,
      c.opaque_verify_request
  )
  SELECT * FROM inserted
  UNION ALL
  SELECT
    false AS was_created,
    c.jti,
    c.partner_id,
    c.policy_id,
    c.policy_version,
    c.return_url,
    c.permission,
    c.permission_version,
    c.purpose,
    c.app_slug,
    c.verify_request_id,
    c.consumed_at,
    c.expires_at,
    c.created_at,
    c.opaque_verify_request
  FROM public.partner_flow_continuations c
  WHERE c.opaque_verify_request = v_opaque
    AND NOT EXISTS (SELECT 1 FROM inserted);
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_partner_flow_continuation_by_opaque(
  text, text, text, text, integer, text, timestamptz, timestamptz, text, text, text, text
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_partner_flow_continuation_by_opaque(
  text, text, text, text, integer, text, timestamptz, timestamptz, text, text, text, text
) TO service_role;

NOTIFY pgrst, 'reload schema';
