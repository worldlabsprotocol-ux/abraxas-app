-- FILE: supabase/migrations/046_verification_layer_idempotent_audit_repair.sql
-- Safe to re-run. Audits verification-layer schema, then applies only missing pieces.
-- Run in Supabase SQL Editor when migrations 038–045 were partially applied.

-- =============================================================================
-- PART A — AUDIT (read-only). Review output before Part B.
-- =============================================================================

WITH required_tables AS (
  SELECT unnest(ARRAY[
    'asset_lot_inventory',
    'asset_lot_status_events',
    'asset_inquiries',
    'security_reports',
    'partner_api_keys',
    'partner_api_usage',
    'authentication_proofs'
  ]) AS table_name
),
required_columns AS (
  SELECT * FROM (VALUES
    ('authentication_proofs', 'id'),
    ('authentication_proofs', 'event_type'),
    ('authentication_proofs', 'record_id'),
    ('authentication_proofs', 'payload_hash'),
    ('authentication_proofs', 'signature'),
    ('authentication_proofs', 'signing_key_id'),
    ('authentication_proofs', 'sui_tx_digest'),
    ('authentication_proofs', 'sui_network'),
    ('authentication_proofs', 'anchor_status'),
    ('authentication_proofs', 'explorer_url'),
    ('authentication_proofs', 'created_at'),
    ('authentication_proofs', 'issued_at'),
    ('authentication_proofs', 'schema_version'),
    ('authentication_proofs', 'network'),
    ('authentication_proofs', 'status'),
    ('authentication_proofs', 'asset_abx_id'),
    ('authentication_proofs', 'superseded_by'),
    ('asset_inquiries', 'proof_id'),
    ('security_reports', 'proof_id'),
    ('partner_api_usage', 'proof_id')
  ) AS t(table_name, column_name)
),
required_policies AS (
  SELECT * FROM (VALUES
    ('asset_lot_inventory', 'asset_lot_inventory_public_read'),
    ('asset_lot_inventory', 'asset_lot_inventory_service_write'),
    ('asset_lot_status_events', 'asset_lot_events_public_read'),
    ('asset_lot_status_events', 'asset_lot_events_service_write'),
    ('asset_inquiries', 'asset_inquiries_service_write'),
    ('security_reports', 'security_reports_service_write'),
    ('authentication_proofs', 'auth_proofs_public_read'),
    ('authentication_proofs', 'auth_proofs_service_write')
  ) AS p(table_name, policy_name)
)
SELECT 'TABLE' AS kind,
       rt.table_name AS object_name,
       CASE WHEN t.table_name IS NOT NULL THEN 'present' ELSE 'MISSING' END AS status
FROM required_tables rt
LEFT JOIN information_schema.tables t
  ON t.table_schema = 'public' AND t.table_name = rt.table_name

UNION ALL

SELECT 'COLUMN' AS kind,
       rc.table_name || '.' || rc.column_name AS object_name,
       CASE WHEN c.column_name IS NOT NULL THEN 'present' ELSE 'MISSING' END AS status
FROM required_columns rc
LEFT JOIN information_schema.columns c
  ON c.table_schema = 'public'
 AND c.table_name = rc.table_name
 AND c.column_name = rc.column_name

UNION ALL

SELECT 'POLICY' AS kind,
       rp.table_name || '.' || rp.policy_name AS object_name,
       CASE WHEN p.policyname IS NOT NULL THEN 'present' ELSE 'MISSING' END AS status
FROM required_policies rp
LEFT JOIN pg_policies p
  ON p.schemaname = 'public'
 AND p.tablename = rp.table_name
 AND p.policyname = rp.policy_name

UNION ALL

SELECT 'SEED' AS kind,
       'asset_lot_inventory rows' AS object_name,
       CASE WHEN (SELECT COUNT(*) FROM asset_lot_inventory) >= 2 THEN 'present' ELSE 'MISSING (run Part B seed)' END AS status
WHERE EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'asset_lot_inventory'
)

ORDER BY kind, object_name;

-- =============================================================================
-- PART B — REPAIR (idempotent). Safe to run multiple times.
-- =============================================================================

-- 038 — lot inventory
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

CREATE INDEX IF NOT EXISTS idx_asset_lot_inventory_asset ON asset_lot_inventory (asset_id);

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

CREATE INDEX IF NOT EXISTS idx_asset_lot_events_asset ON asset_lot_status_events (asset_id, created_at DESC);

ALTER TABLE asset_lot_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_lot_status_events ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'asset_lot_inventory' AND policyname = 'asset_lot_inventory_public_read') THEN
    CREATE POLICY "asset_lot_inventory_public_read" ON asset_lot_inventory FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'asset_lot_inventory' AND policyname = 'asset_lot_inventory_service_write') THEN
    CREATE POLICY "asset_lot_inventory_service_write" ON asset_lot_inventory FOR ALL
      USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'asset_lot_status_events' AND policyname = 'asset_lot_events_public_read') THEN
    CREATE POLICY "asset_lot_events_public_read" ON asset_lot_status_events FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'asset_lot_status_events' AND policyname = 'asset_lot_events_service_write') THEN
    CREATE POLICY "asset_lot_events_service_write" ON asset_lot_status_events FOR ALL
      USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;

-- 040 — asset inquiries
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

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'asset_inquiries' AND policyname = 'asset_inquiries_service_write') THEN
    CREATE POLICY "asset_inquiries_service_write" ON asset_inquiries FOR ALL
      USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;

-- 041 — security reports
CREATE TABLE IF NOT EXISTS security_reports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL,
  severity        TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low', 'informational')),
  description     TEXT NOT NULL,
  reproduction    TEXT,
  contact_email   TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'submitted',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_security_reports_created ON security_reports (created_at DESC);
ALTER TABLE security_reports ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'security_reports' AND policyname = 'security_reports_service_write') THEN
    CREATE POLICY "security_reports_service_write" ON security_reports FOR ALL
      USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;

-- 024 — partner API (needed before partner_api_usage.proof_id)
CREATE TABLE IF NOT EXISTS public.partner_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id text NOT NULL,
  display_name text NOT NULL,
  key_prefix text NOT NULL,
  key_hash text NOT NULL UNIQUE,
  scopes text[] NOT NULL DEFAULT array['verify:credential', 'verify:registry'],
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz
);

CREATE INDEX IF NOT EXISTS partner_api_keys_hash_idx ON public.partner_api_keys (key_hash) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS partner_api_keys_partner_idx ON public.partner_api_keys (partner_id);

CREATE TABLE IF NOT EXISTS public.partner_api_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id text,
  api_key_id uuid REFERENCES public.partner_api_keys(id) ON DELETE SET NULL,
  endpoint text NOT NULL,
  method text NOT NULL,
  success boolean,
  response_state text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS partner_api_usage_created_idx ON public.partner_api_usage (created_at DESC);
CREATE INDEX IF NOT EXISTS partner_api_usage_partner_idx ON public.partner_api_usage (partner_id, created_at DESC);
ALTER TABLE public.partner_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_api_usage ENABLE ROW LEVEL SECURITY;

-- 042 — authentication proofs
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

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'authentication_proofs' AND policyname = 'auth_proofs_public_read') THEN
    CREATE POLICY "auth_proofs_public_read" ON authentication_proofs FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'authentication_proofs' AND policyname = 'auth_proofs_service_write') THEN
    CREATE POLICY "auth_proofs_service_write" ON authentication_proofs FOR ALL
      USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;

-- 042 links + 043 metadata + 044 lifecycle (column-by-column, never fails if present)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'asset_inquiries')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'asset_inquiries' AND column_name = 'proof_id') THEN
    ALTER TABLE asset_inquiries ADD COLUMN proof_id TEXT;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'security_reports')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'security_reports' AND column_name = 'proof_id') THEN
    ALTER TABLE security_reports ADD COLUMN proof_id TEXT;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'authentication_proofs')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'authentication_proofs' AND column_name = 'issued_at') THEN
    ALTER TABLE authentication_proofs ADD COLUMN issued_at TIMESTAMPTZ;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'authentication_proofs')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'authentication_proofs' AND column_name = 'schema_version') THEN
    ALTER TABLE authentication_proofs ADD COLUMN schema_version TEXT DEFAULT '1.0.0';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'authentication_proofs')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'authentication_proofs' AND column_name = 'network') THEN
    ALTER TABLE authentication_proofs ADD COLUMN network TEXT;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'authentication_proofs')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'authentication_proofs' AND column_name = 'status') THEN
    ALTER TABLE authentication_proofs ADD COLUMN status TEXT NOT NULL DEFAULT 'active';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'authentication_proofs')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'authentication_proofs' AND column_name = 'asset_abx_id') THEN
    ALTER TABLE authentication_proofs ADD COLUMN asset_abx_id TEXT;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'authentication_proofs')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'authentication_proofs' AND column_name = 'superseded_by') THEN
    ALTER TABLE authentication_proofs ADD COLUMN superseded_by TEXT;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'partner_api_usage')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'partner_api_usage' AND column_name = 'proof_id') THEN
    ALTER TABLE partner_api_usage ADD COLUMN proof_id TEXT;
  END IF;
END $$;

UPDATE authentication_proofs
SET
  issued_at = COALESCE(issued_at, created_at),
  schema_version = COALESCE(schema_version, '1.0.0'),
  network = COALESCE(network, sui_network),
  status = COALESCE(status, 'active')
WHERE issued_at IS NULL OR schema_version IS NULL OR network IS NULL OR status IS NULL;

CREATE INDEX IF NOT EXISTS idx_auth_proofs_asset_status
  ON authentication_proofs (asset_abx_id, status)
  WHERE asset_abx_id IS NOT NULL;

-- 045 — seed (upsert, never duplicates)
INSERT INTO asset_lot_inventory (asset_id, lot_number, acres, price_usd, status, notes, source)
VALUES
  ('ABX-RE-HOSP-001', 1, NULL, 12500000, 'available', 'Cielo Sunrise — hospitality RWA reference asset', 'verification_layer_seed'),
  ('ABX-RE-LAND-006', 1, 270.0, 890000, 'available', 'Chickasaw Project — land diligence reference', 'verification_layer_seed')
ON CONFLICT (asset_id, lot_number) DO UPDATE SET
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  source = EXCLUDED.source,
  updated_at = now();

-- Re-run Part A audit query above to confirm all rows show 'present'.
