#!/usr/bin/env bash
# FILE: scripts/ci/run-migration-153-sql-parity.sh
set -euo pipefail

: "${MIGRATION_153_PG_URL:?MIGRATION_153_PG_URL is required}"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

psql "$MIGRATION_153_PG_URL" -v ON_ERROR_STOP=1 -f scripts/ci/migration-153-parity-bootstrap.sql
psql "$MIGRATION_153_PG_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/033_decision_receipts.sql
psql "$MIGRATION_153_PG_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/151_decision_receipt_issuance_finalization.sql
psql "$MIGRATION_153_PG_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/152_decision_receipt_v1_1_signed_fields.sql
psql "$MIGRATION_153_PG_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/153_decision_receipt_v11_finalize_atomic.sql
psql "$MIGRATION_153_PG_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/153_decision_receipt_v11_finalize_atomic.sql

psql "$MIGRATION_153_PG_URL" -v ON_ERROR_STOP=1 -c "
  GRANT SELECT, INSERT, UPDATE ON public.decision_receipts TO service_role;
  GRANT SELECT, INSERT ON public.verification_decisions TO service_role;
"

export MIGRATION_151_153_PG_URL="${MIGRATION_151_153_PG_URL:-$MIGRATION_153_PG_URL}"

npx vitest run lib/decisionReceipts/v1_1_0/migration153.sqlParity.test.ts lib/decisionReceipts/v1_1_0/migration151153Chain.sqlParity.test.ts
