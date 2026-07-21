-- FILE: supabase/migrations/040_asset_inquiries.sql
-- Asset acquisition inquiries — closed-loop partner routing (e.g. Chickasaw).

CREATE TABLE IF NOT EXISTS asset_inquiries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id        TEXT NOT NULL,
  asset_name      TEXT NOT NULL,
  package_interest TEXT,
  email           TEXT NOT NULL,
  wallet          TEXT,
  message         TEXT,
  status          TEXT NOT NULL DEFAULT 'submitted',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_asset_inquiries_asset ON asset_inquiries (asset_id, created_at DESC);

ALTER TABLE asset_inquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "asset_inquiries_service_write"
  ON asset_inquiries FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
