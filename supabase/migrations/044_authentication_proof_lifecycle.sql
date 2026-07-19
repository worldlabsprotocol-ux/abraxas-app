-- FILE: supabase/migrations/044_authentication_proof_lifecycle.sql
-- Proof lifecycle — refresh/revocation when asset state changes.

ALTER TABLE authentication_proofs
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'refresh_required', 'superseded')),
  ADD COLUMN IF NOT EXISTS asset_abx_id TEXT,
  ADD COLUMN IF NOT EXISTS superseded_by TEXT;

CREATE INDEX IF NOT EXISTS idx_auth_proofs_asset_status
  ON authentication_proofs (asset_abx_id, status)
  WHERE asset_abx_id IS NOT NULL;

ALTER TABLE partner_api_usage
  ADD COLUMN IF NOT EXISTS proof_id TEXT;
