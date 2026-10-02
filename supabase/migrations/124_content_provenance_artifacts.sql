-- FILE: supabase/migrations/124_content_provenance_artifacts.sql
-- Content artifact bindings — hash-only, no raw media retention.

CREATE TABLE IF NOT EXISTS content_artifact_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'application/octet-stream',
  byte_length BIGINT NOT NULL CHECK (byte_length >= 0),
  canonicalization_version TEXT NOT NULL DEFAULT 'abx-artifact-v1',
  parent_artifact_id UUID REFERENCES content_artifact_records(id) ON DELETE SET NULL,
  binding_method TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  CONSTRAINT content_artifact_records_hash_format CHECK (content_hash ~ '^[a-f0-9]{64}$')
);

CREATE INDEX IF NOT EXISTS idx_content_artifact_records_subject
  ON content_artifact_records (subject_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_content_artifact_records_subject_hash_active
  ON content_artifact_records (subject_id, content_hash)
  WHERE status = 'active';

COMMENT ON TABLE content_artifact_records IS
  'Privacy-preserving artifact fingerprint bindings. Stores hashes only — never raw copyrighted media.';

ALTER TABLE content_artifact_records ENABLE ROW LEVEL SECURITY;
