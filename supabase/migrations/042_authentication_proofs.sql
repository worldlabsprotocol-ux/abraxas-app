-- FILE: supabase/migrations/042_authentication_proofs.sql
-- On-chain authentication proofs — Abraxas core artifact (replaces email-as-truth).

CREATE TABLE IF NOT EXISTS authentication_proofs (
  id              TEXT PRIMARY KEY,
  event_type      TEXT NOT NULL,
  record_id       TEXT NOT NULL,
  payload_hash    TEXT NOT NULL,
  signature       TEXT NOT NULL,
  signing_key_id  TEXT NOT NULL DEFAULT 'abraxas-primary',
  sui_tx_digest   TEXT,
  sui_network     TEXT,
  anchor_status   TEXT NOT NULL DEFAULT 'signed'
                  CHECK (anchor_status IN ('signed', 'anchored', 'anchor_failed')),
  explorer_url    TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auth_proofs_record ON authentication_proofs (record_id);
CREATE INDEX IF NOT EXISTS idx_auth_proofs_event ON authentication_proofs (event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auth_proofs_tx ON authentication_proofs (sui_tx_digest) WHERE sui_tx_digest IS NOT NULL;

ALTER TABLE authentication_proofs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_proofs_public_read"
  ON authentication_proofs FOR SELECT
  USING (true);

CREATE POLICY "auth_proofs_service_write"
  ON authentication_proofs FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Link proofs back to source records
ALTER TABLE asset_inquiries ADD COLUMN IF NOT EXISTS proof_id TEXT;
ALTER TABLE security_reports ADD COLUMN IF NOT EXISTS proof_id TEXT;
