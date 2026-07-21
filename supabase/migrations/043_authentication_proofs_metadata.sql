-- FILE: supabase/migrations/043_authentication_proofs_metadata.sql
-- Persist signed payload metadata for independent verification.

ALTER TABLE authentication_proofs
  ADD COLUMN IF NOT EXISTS issued_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS schema_version TEXT DEFAULT '1.0.0',
  ADD COLUMN IF NOT EXISTS network TEXT;

UPDATE authentication_proofs
SET
  issued_at = COALESCE(issued_at, created_at),
  schema_version = COALESCE(schema_version, '1.0.0'),
  network = COALESCE(network, sui_network)
WHERE issued_at IS NULL OR network IS NULL;
