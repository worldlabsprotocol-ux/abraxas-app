#!/usr/bin/env bash
# Migration 133 atomic RPC disambiguation — SQL bootstrap + sequential/concurrency parity.
set -euo pipefail

: "${MIGRATION_133_PG_URL:?MIGRATION_133_PG_URL is required}"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

psql "$MIGRATION_133_PG_URL" -v ON_ERROR_STOP=1 -f "$ROOT/supabase/migrations/091_partner_flow_continuations.sql"
psql "$MIGRATION_133_PG_URL" -v ON_ERROR_STOP=1 -f "$ROOT/supabase/migrations/130_partner_flow_continuations_opaque_verify_request.sql"
psql "$MIGRATION_133_PG_URL" -v ON_ERROR_STOP=1 -f "$ROOT/supabase/migrations/132_partner_flow_continuation_ensure_by_opaque.sql"
psql "$MIGRATION_133_PG_URL" -v ON_ERROR_STOP=1 -f "$ROOT/supabase/migrations/133_partner_flow_continuation_atomic_rpc_disambiguation.sql"

npx vitest run lib/partner/partnerFlowContinuationMigration133.sqlParity.test.ts
