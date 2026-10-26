#!/usr/bin/env bash
# FILE: scripts/ci/run-migration-evidence-chain-parity.sh
# Apply 033→034→059→093→113 before v1.1 chain on disposable Postgres (CI only).
set -euo pipefail

: "${MIGRATION_EVIDENCE_CHAIN_PG_URL:?MIGRATION_EVIDENCE_CHAIN_PG_URL is required}"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

ADMIN_URL="${MIGRATION_EVIDENCE_CHAIN_ADMIN_PG_URL:-postgresql://postgres:postgres@127.0.0.1:5432/postgres}"
DB_NAME="$(echo "$MIGRATION_EVIDENCE_CHAIN_PG_URL" | sed -E 's|.*/||')"
psql "$ADMIN_URL" -v ON_ERROR_STOP=1 -tc "SELECT 1 FROM pg_database WHERE datname = '${DB_NAME}'" | grep -q 1 \
  || psql "$ADMIN_URL" -v ON_ERROR_STOP=1 -c "CREATE DATABASE \"${DB_NAME}\";"

psql "$MIGRATION_EVIDENCE_CHAIN_PG_URL" -v ON_ERROR_STOP=1 -f scripts/ci/migration-153-parity-bootstrap.sql
psql "$MIGRATION_EVIDENCE_CHAIN_PG_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/033_decision_receipts.sql
psql "$MIGRATION_EVIDENCE_CHAIN_PG_URL" -v ON_ERROR_STOP=1 -f scripts/ci/migration-evidence-chain-stubs.sql
psql "$MIGRATION_EVIDENCE_CHAIN_PG_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/034_credential_status_registry.sql
psql "$MIGRATION_EVIDENCE_CHAIN_PG_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/059_decision_receipt_revocation_events.sql
psql "$MIGRATION_EVIDENCE_CHAIN_PG_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/093_reusable_eligibility_facts.sql
psql "$MIGRATION_EVIDENCE_CHAIN_PG_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/113_decision_receipt_evidence_dependencies.sql
psql "$MIGRATION_EVIDENCE_CHAIN_PG_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/151_decision_receipt_issuance_finalization.sql
psql "$MIGRATION_EVIDENCE_CHAIN_PG_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/152_decision_receipt_v1_1_signed_fields.sql
psql "$MIGRATION_EVIDENCE_CHAIN_PG_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/153_decision_receipt_v11_finalize_atomic.sql

export MIGRATION_EVIDENCE_CHAIN_PG_URL
export MIGRATION_151_153_PG_URL="$MIGRATION_EVIDENCE_CHAIN_PG_URL"
export MIGRATION_153_PG_URL="$MIGRATION_EVIDENCE_CHAIN_PG_URL"

npx vitest run lib/decisionReceipts/evidenceMigrationChain.sqlParity.test.ts
