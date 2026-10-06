-- FILE: supabase/migrations/131_partner_flow_continuation_opaque_peek.sql
-- SQL peek for hosted-handoff opaque vr_* continuations. Closes #561 lookup miss where
-- PostgREST table filters can return zero rows while the opaque unique index proves the row exists.
-- Idempotent. Safe on DEMO and Production.

CREATE OR REPLACE FUNCTION public.partner_flow_continuation_peek_by_opaque(p_opaque text)
RETURNS SETOF public.partner_flow_continuations
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM public.partner_flow_continuations
  WHERE opaque_verify_request = btrim(p_opaque)
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.partner_flow_continuation_peek_by_opaque(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.partner_flow_continuation_peek_by_opaque(text) TO service_role;

NOTIFY pgrst, 'reload schema';
