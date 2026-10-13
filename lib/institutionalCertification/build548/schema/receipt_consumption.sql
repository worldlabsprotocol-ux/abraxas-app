-- Build #548 — disposable institutional replay DB (not Abraxas Supabase production).
-- Apply to independently provisioned PostgreSQL only with operator authorization.

CREATE SCHEMA IF NOT EXISTS build548_consumption;

CREATE TABLE IF NOT EXISTS build548_consumption.receipt_consumption (
  replay_key TEXT PRIMARY KEY,
  consumption_id TEXT NOT NULL,
  receipt_id TEXT NOT NULL,
  partner_id TEXT NOT NULL,
  policy_id TEXT NOT NULL,
  request_id TEXT NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL,
  instance_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_build548_consumption_receipt
  ON build548_consumption.receipt_consumption (receipt_id);

CREATE TABLE IF NOT EXISTS build548_consumption.receipt_consumption_audit (
  audit_id BIGSERIAL PRIMARY KEY,
  replay_key TEXT NOT NULL UNIQUE REFERENCES build548_consumption.receipt_consumption (replay_key) ON DELETE CASCADE,
  consumption_id TEXT NOT NULL,
  receipt_id TEXT NOT NULL,
  partner_id TEXT NOT NULL,
  policy_id TEXT NOT NULL,
  request_id TEXT NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL,
  instance_id TEXT NOT NULL,
  committed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON SCHEMA build548_consumption IS
  'External RP replay protection — independent of Abraxas application Supabase.';
