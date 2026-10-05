#!/usr/bin/env bash
# Migration 132 opaque continuation ensure — SQL bootstrap + READ COMMITTED concurrency parity.
set -euo pipefail

: "${MIGRATION_132_PG_URL:?MIGRATION_132_PG_URL is required}"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

psql "$MIGRATION_132_PG_URL" -v ON_ERROR_STOP=1 -f "$ROOT/supabase/migrations/091_partner_flow_continuations.sql"
psql "$MIGRATION_132_PG_URL" -v ON_ERROR_STOP=1 -f "$ROOT/supabase/migrations/130_partner_flow_continuations_opaque_verify_request.sql"
psql "$MIGRATION_132_PG_URL" -v ON_ERROR_STOP=1 -f "$ROOT/supabase/migrations/132_partner_flow_continuation_ensure_by_opaque.sql"

psql "$MIGRATION_132_PG_URL" -v ON_ERROR_STOP=1 -c "
  SELECT pg_catalog.count(*)::int AS ensure_fn_exists
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public'
     AND p.proname = 'ensure_partner_flow_continuation_by_opaque';
"

npx vitest run lib/partner/partnerFlowContinuationMigration132.sqlParity.test.ts
