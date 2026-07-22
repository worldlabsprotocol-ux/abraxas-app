-- FILE: supabase/migrations/047_verification_layer_audit_query.sql
-- One-shot Supabase audit — paste in SQL Editor and run once.
-- Read the SUMMARY row first. All other rows should say PASS.

WITH
write_probe AS (
  INSERT INTO authentication_proofs (
    id, event_type, record_id, payload_hash, signature,
    signing_key_id, anchor_status, issued_at, schema_version, network, status
  )
  SELECT
    'aprx_audit_' || replace(gen_random_uuid()::text, '-', ''),
    'credential_verify',
    'supabase-audit-probe',
    repeat('0', 64),
    'audit-probe-signature',
    'audit-probe',
    'signed',
    now(),
    '1.0.0',
    'devnet',
    'active'
  WHERE EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'authentication_proofs'
  )
  RETURNING id
),
write_cleanup AS (
  DELETE FROM authentication_proofs
  WHERE id IN (SELECT id FROM write_probe)
  RETURNING id
),
checks AS (
  SELECT 1 AS sort_order, 'table' AS category, t.table_name AS check_name,
    CASE WHEN EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t.table_name
    ) THEN 'PASS' ELSE 'FAIL' END AS status,
    'Required table' AS detail
  FROM (VALUES
    ('asset_lot_inventory'),
    ('asset_lot_status_events'),
    ('asset_inquiries'),
    ('security_reports'),
    ('partner_api_keys'),
    ('partner_api_usage'),
    ('authentication_proofs')
  ) AS t(table_name)

  UNION ALL

  SELECT 2, 'column', c.table_name || '.' || c.column_name,
    CASE WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = c.table_name
        AND column_name = c.column_name
    ) THEN 'PASS' ELSE 'FAIL' END,
    'Required column'
  FROM (VALUES
    ('authentication_proofs', 'issued_at'),
    ('authentication_proofs', 'schema_version'),
    ('authentication_proofs', 'network'),
    ('authentication_proofs', 'status'),
    ('authentication_proofs', 'asset_abx_id'),
    ('authentication_proofs', 'superseded_by'),
    ('asset_inquiries', 'proof_id'),
    ('security_reports', 'proof_id'),
    ('partner_api_usage', 'proof_id')
  ) AS c(table_name, column_name)

  UNION ALL

  SELECT 3, 'rls', c.relname,
    CASE WHEN c.relrowsecurity THEN 'PASS' ELSE 'FAIL' END,
    'Row level security enabled'
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname IN (
      'asset_lot_inventory', 'asset_lot_status_events', 'asset_inquiries',
      'security_reports', 'authentication_proofs', 'partner_api_keys', 'partner_api_usage'
    )
    AND c.relkind = 'r'

  UNION ALL

  SELECT 4, 'policy', p.table_name || '.' || p.policy_name,
    CASE WHEN EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = p.table_name
        AND policyname = p.policy_name
    ) THEN 'PASS' ELSE 'FAIL' END,
    'Required RLS policy'
  FROM (VALUES
    ('asset_lot_inventory', 'asset_lot_inventory_public_read'),
    ('asset_lot_inventory', 'asset_lot_inventory_service_write'),
    ('asset_lot_status_events', 'asset_lot_events_public_read'),
    ('asset_lot_status_events', 'asset_lot_events_service_write'),
    ('asset_inquiries', 'asset_inquiries_service_write'),
    ('security_reports', 'security_reports_service_write'),
    ('authentication_proofs', 'auth_proofs_public_read'),
    ('authentication_proofs', 'auth_proofs_service_write')
  ) AS p(table_name, policy_name)

  UNION ALL

  SELECT 5, 'seed', 'lot_inventory.total_rows >= 2',
    CASE WHEN (SELECT COUNT(*) FROM asset_lot_inventory) >= 2 THEN 'PASS' ELSE 'FAIL' END,
    'Need Cielo + Chickasaw reference lots'

  UNION ALL

  SELECT 5, 'seed', 'lot_inventory.ABX-RE-HOSP-001',
    CASE WHEN EXISTS (
      SELECT 1 FROM asset_lot_inventory WHERE asset_id = 'ABX-RE-HOSP-001'
    ) THEN 'PASS' ELSE 'FAIL' END,
    'Cielo Sunrise reference lot'

  UNION ALL

  SELECT 5, 'seed', 'lot_inventory.ABX-RE-LAND-006',
    CASE WHEN EXISTS (
      SELECT 1 FROM asset_lot_inventory WHERE asset_id = 'ABX-RE-LAND-006'
    ) THEN 'PASS' ELSE 'FAIL' END,
    'Chickasaw reference lot'

  UNION ALL

  SELECT 6, 'write_probe', 'authentication_proofs insert+delete',
    CASE
      WHEN NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'authentication_proofs'
      ) THEN 'FAIL'
      WHEN EXISTS (SELECT 1 FROM write_cleanup) THEN 'PASS'
      ELSE 'FAIL'
    END,
    'Service role / RLS write path works'

  UNION ALL

  SELECT 7, 'info', 'authentication_proofs.total_rows',
    'PASS',
    'count=' || COALESCE((SELECT COUNT(*)::text FROM authentication_proofs), '0')

  UNION ALL

  SELECT 7, 'info', 'asset_lot_inventory.total_rows',
    'PASS',
    'count=' || COALESCE((SELECT COUNT(*)::text FROM asset_lot_inventory), '0')
),
summary AS (
  SELECT
    0 AS sort_order,
    '>>> SUMMARY' AS category,
    CASE
      WHEN COUNT(*) FILTER (WHERE status = 'FAIL' AND category <> 'info') = 0
      THEN 'ALL PASS — Supabase verification layer DB is ready'
      ELSE 'FAILURES FOUND — see FAIL rows below'
    END AS check_name,
    CASE
      WHEN COUNT(*) FILTER (WHERE status = 'FAIL' AND category <> 'info') = 0
      THEN 'PASS'
      ELSE 'FAIL'
    END AS status,
    COUNT(*) FILTER (WHERE status = 'PASS' AND category <> 'info')::text || ' passed, ' ||
    COUNT(*) FILTER (WHERE status = 'FAIL' AND category <> 'info')::text || ' failed' AS detail
  FROM checks
),
detail AS (
  SELECT sort_order, category, check_name, status, detail
  FROM checks
  WHERE category <> 'info' OR check_name LIKE '%.total_rows'
)
SELECT category, check_name, status, detail
FROM (
  SELECT * FROM summary
  UNION ALL
  SELECT * FROM detail
) combined
ORDER BY sort_order, category, check_name;
