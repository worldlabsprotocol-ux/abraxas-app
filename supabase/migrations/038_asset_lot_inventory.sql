-- FILE: supabase/migrations/038_asset_lot_inventory.sql
-- MLS / lot inventory — partner push, admin override, monitoring feed source.

CREATE TABLE IF NOT EXISTS asset_lot_inventory (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id        TEXT NOT NULL,
  lot_number      INT NOT NULL,
  acres           NUMERIC,
  price_usd       INT,
  status          TEXT NOT NULL CHECK (status IN ('available', 'under_contract', 'contingent', 'sold')),
  notes           TEXT,
  mls_listing_id  TEXT,
  source          TEXT NOT NULL DEFAULT 'static_seed',
  observed_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (asset_id, lot_number)
);

CREATE INDEX IF NOT EXISTS idx_asset_lot_inventory_asset
  ON asset_lot_inventory (asset_id);

CREATE TABLE IF NOT EXISTS asset_lot_status_events (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id         TEXT NOT NULL,
  lot_number       INT NOT NULL,
  from_status      TEXT,
  to_status        TEXT NOT NULL,
  source           TEXT NOT NULL,
  detail           JSONB DEFAULT '{}'::jsonb,
  partner_id       TEXT,
  idempotency_key  TEXT UNIQUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_asset_lot_events_asset
  ON asset_lot_status_events (asset_id, created_at DESC);

ALTER TABLE asset_lot_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_lot_status_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "asset_lot_inventory_public_read"
  ON asset_lot_inventory FOR SELECT
  USING (true);

CREATE POLICY "asset_lot_inventory_service_write"
  ON asset_lot_inventory FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "asset_lot_events_public_read"
  ON asset_lot_status_events FOR SELECT
  USING (true);

CREATE POLICY "asset_lot_events_service_write"
  ON asset_lot_status_events FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
