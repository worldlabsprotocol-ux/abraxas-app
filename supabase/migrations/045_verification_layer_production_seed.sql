// FILE: supabase/migrations/045_verification_layer_production_seed.sql
-- Production reference lot inventory for asset monitoring gate (Cielo + Chickasaw).

INSERT INTO asset_lot_inventory (asset_id, lot_number, acres, price_usd, status, notes, source)
VALUES
  ('ABX-RE-HOSP-001', 1, NULL, 12500000, 'available', 'Cielo Sunrise — hospitality RWA reference asset', 'verification_layer_seed'),
  ('ABX-RE-LAND-006', 1, 270.0, 890000, 'available', 'Chickasaw Project — land diligence reference', 'verification_layer_seed')
ON CONFLICT (asset_id, lot_number) DO UPDATE SET
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  source = EXCLUDED.source,
  updated_at = now();
