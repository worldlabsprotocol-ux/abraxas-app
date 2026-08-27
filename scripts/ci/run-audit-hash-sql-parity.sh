#!/usr/bin/env bash
# FILE: scripts/ci/run-audit-hash-sql-parity.sh
# Bootstrap fixture, apply migration 072, run executable SQL/TS parity tests.

set -euo pipefail

: "${AUDIT_HASH_PG_URL:?AUDIT_HASH_PG_URL is required}"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

psql "$AUDIT_HASH_PG_URL" -v ON_ERROR_STOP=1 -f scripts/ci/migration-072-parity-bootstrap.sql
psql "$AUDIT_HASH_PG_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/072_design_partner_lifecycle_audit_atomic.sql
npx vitest run lib/verification/auditEventHash.sqlParity.test.ts
