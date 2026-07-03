-- Copy-paste into Supabase SQL editor
-- Public credential verifier registry (Door 3: /verify)

CREATE TABLE IF NOT EXISTS verified_registry (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  did_identifier      TEXT NOT NULL UNIQUE,
  display_name        TEXT,
  asset_class         TEXT NOT NULL,
  verification_status TEXT NOT NULL DEFAULT 'RESOLVED_VALID',
  current_pipeline_stage TEXT,
  assurance_level     INT NOT NULL DEFAULT 1 CHECK (assurance_level BETWEEN 1 AND 4),
  assurance_taxonomy  JSONB DEFAULT '{}'::jsonb,
  metadata_uri        TEXT,
  anchor_block        BIGINT,
  revocation_reason_code TEXT,
  last_monitored_sync TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_verified_registry_status
  ON verified_registry (verification_status);

ALTER TABLE verified_registry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "verified_registry_public_read"
  ON verified_registry FOR SELECT
  USING (true);

CREATE POLICY "verified_registry_service_write"
  ON verified_registry FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Seed Cielo flagship entry
INSERT INTO verified_registry (
  did_identifier, display_name, asset_class, verification_status,
  current_pipeline_stage, assurance_level, metadata_uri, last_monitored_sync,
  assurance_taxonomy
) VALUES (
  'did:sui:cielo-abx-re-hosp-001',
  'Cielo Sunrise',
  'REAL_ESTATE_HOSPITALITY',
  'RESOLVED_VALID',
  'MARKETPLACE_LIVE',
  3,
  '/flagship',
  now(),
  '{"L1_IdentityClaim":{"status":"VERIFIED","provider":"Veriff_Biometric_IDV"},"L2_LegalReview":{"status":"VERIFIED","provider":"Fannin_County_Deed_Review"},"L3_ProfessionalAttestation":{"status":"VERIFIED","authority":"Independent_Appraisal_V5"},"L4_ActiveMonitoring":{"status":"ACTIVE","oracleSource":"Airbnb_Listing_CrossCheck"}}'::jsonb
) ON CONFLICT (did_identifier) DO NOTHING;
