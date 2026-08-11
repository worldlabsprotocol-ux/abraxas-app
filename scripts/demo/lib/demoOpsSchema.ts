// FILE: scripts/demo/lib/demoOpsSchema.ts
// Demo-ops schema bootstrap — not an Abraxas application migration.

export const DEMO_OPS_SCHEMA = "demo_ops";
export const DEMO_OPS_MIGRATION_LEDGER_TABLE = "migration_ledger";
export const DEMO_MIGRATION_RUNNER_VERSION = "demo-migrate-v1";

/** Fixed advisory-lock namespace for demo migration runs. */
export const DEMO_MIGRATION_ADVISORY_LOCK_NAMESPACE = "abraxas:demo:migrate";

/**
 * Idempotent demo-ops ledger initialization.
 * - Lives outside public application schema
 * - No RLS policies (deny-by-default for PostgREST roles)
 * - Not part of supabase/migrations manifest
 */
export const DEMO_OPS_LEDGER_INIT_SQL = `
CREATE SCHEMA IF NOT EXISTS demo_ops;
REVOKE ALL ON SCHEMA demo_ops FROM PUBLIC;
GRANT USAGE ON SCHEMA demo_ops TO CURRENT_USER;

CREATE TABLE IF NOT EXISTS demo_ops.migration_ledger (
  filename text PRIMARY KEY,
  sha256 text NOT NULL CHECK (char_length(sha256) = 64),
  applied_at timestamptz NOT NULL DEFAULT now(),
  runner_version text NOT NULL
);

REVOKE ALL ON TABLE demo_ops.migration_ledger FROM PUBLIC;
REVOKE ALL ON TABLE demo_ops.migration_ledger FROM anon;
REVOKE ALL ON TABLE demo_ops.migration_ledger FROM authenticated;
ALTER TABLE demo_ops.migration_ledger ENABLE ROW LEVEL SECURITY;
`;

export const DEMO_OPS_LEDGER_INSERT_SQL = `
INSERT INTO demo_ops.migration_ledger (filename, sha256, runner_version, applied_at)
VALUES ($1, $2, $3, COALESCE($4::timestamptz, now()))
ON CONFLICT (filename) DO NOTHING
RETURNING filename, sha256, runner_version, applied_at
`;

export const DEMO_OPS_LEDGER_SELECT_SQL = `
SELECT filename, sha256, applied_at, runner_version
FROM demo_ops.migration_ledger
WHERE filename = $1
`;

export const DEMO_OPS_LEDGER_LIST_SQL = `
SELECT filename, sha256, applied_at, runner_version
FROM demo_ops.migration_ledger
ORDER BY applied_at ASC
`;
