-- FILE: supabase/migrations/152_portable_export_status_checkpoint_atomic_rpc.sql
-- Atomic monotonic status_version for Demo portable export (BUILD #824). PostgREST must use this RPC, not read-modify-write.

CREATE OR REPLACE FUNCTION public.bump_portable_export_status_checkpoint(p_receipt_id text)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_receipt_id text := btrim(p_receipt_id);
  v_version bigint;
BEGIN
  IF v_receipt_id IS NULL OR v_receipt_id = '' THEN
    RAISE EXCEPTION 'receipt_id_required'
      USING ERRCODE = '22023';
  END IF;
  IF length(v_receipt_id) > 256 THEN
    RAISE EXCEPTION 'receipt_id_too_long'
      USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.portable_export_status_checkpoints (receipt_id, status_version)
  VALUES (v_receipt_id, 1)
  ON CONFLICT (receipt_id) DO UPDATE
    SET status_version = public.portable_export_status_checkpoints.status_version + 1
  RETURNING status_version INTO v_version;

  RETURN v_version;
END;
$$;

REVOKE ALL ON FUNCTION public.bump_portable_export_status_checkpoint(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bump_portable_export_status_checkpoint(text) TO postgres, service_role;

-- Narrow service_role table access: checkpoint bumps only via RPC (fail closed on ad hoc PostgREST upsert).
REVOKE INSERT, UPDATE ON TABLE public.portable_export_status_checkpoints FROM service_role;

NOTIFY pgrst, 'reload schema';