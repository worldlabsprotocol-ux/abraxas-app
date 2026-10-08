#!/usr/bin/env bash
# Migration 137 privileged adopt RPC — SQL bootstrap + security parity tests.
set -euo pipefail

: "${MIGRATION_137_PG_URL:?MIGRATION_137_PG_URL is required}"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

psql "$MIGRATION_137_PG_URL" -v ON_ERROR_STOP=1 -f "$ROOT/supabase/test/migration137_adopt_rpc_bootstrap.sql"
psql "$MIGRATION_137_PG_URL" -v ON_ERROR_STOP=1 -f "$ROOT/supabase/migrations/137_production_policy_change_control.sql"

npx vitest run lib/policy/changeControl/migration137AdoptRpc.sqlParity.test.ts
