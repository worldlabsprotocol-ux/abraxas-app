-- FILE: supabase/migrations/048_authentication_proofs_write_probe.sql
-- SQL Editor runs under RLS; this SECURITY DEFINER probe matches app service_role writes.

CREATE OR REPLACE FUNCTION public.abraxas_audit_proof_write_probe()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  probe_id text := 'aprx_audit_' || replace(gen_random_uuid()::text, '-', '');
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'authentication_proofs'
  ) THEN
    RETURN false;
  END IF;

  INSERT INTO authentication_proofs (
    id, event_type, record_id, payload_hash, signature,
    signing_key_id, anchor_status, issued_at, schema_version, network, status
  ) VALUES (
    probe_id,
    'credential_verify',
    'supabase-audit-probe',
    repeat('0', 64),
    'audit-probe-signature',
    'audit-probe',
    'signed',
    now(),
    '1.0.0',
    'devnet',
    'active'
  );

  DELETE FROM authentication_proofs WHERE id = probe_id;
  RETURN true;
EXCEPTION WHEN OTHERS THEN
  RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION public.abraxas_audit_proof_write_probe() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.abraxas_audit_proof_write_probe() TO postgres, service_role, authenticated, anon;
