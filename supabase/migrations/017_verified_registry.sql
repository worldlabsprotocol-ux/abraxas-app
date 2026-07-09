-- FILE: supabase/migrations/017_verified_registry.sql
-- Public credential verifier registry for Door 3 (/verify).

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

-- Public read for relying parties
CREATE POLICY "verified_registry_public_read"
  ON verified_registry FOR SELECT
  USING (true);

-- Service role writes only (no public insert/update)
CREATE POLICY "verified_registry_service_write"
  ON verified_registry FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
