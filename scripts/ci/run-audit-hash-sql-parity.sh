#!/usr/bin/env bash
# FILE: scripts/ci/run-audit-hash-sql-parity.sh
# Bootstrap fixture, apply migrations 072 + 073 + 074, run executable SQL/TS parity tests.

set -euo pipefail

: "${AUDIT_HASH_PG_URL:?AUDIT_HASH_PG_URL is required}"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

psql "$AUDIT_HASH_PG_URL" -v ON_ERROR_STOP=1 -f scripts/ci/migration-072-parity-bootstrap.sql
psql "$AUDIT_HASH_PG_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/072_design_partner_lifecycle_audit_atomic.sql

echo "Verifying pre-073 Production drift is present before migration 073..."
psql "$AUDIT_HASH_PG_URL" -v ON_ERROR_STOP=1 -c \
  "SELECT has_table_privilege('service_role', 'public.audit_events', 'DELETE') AS service_role_can_delete_before_073;"
psql "$AUDIT_HASH_PG_URL" -v ON_ERROR_STOP=1 -tA -c \
  "SELECT has_table_privilege('service_role', 'public.audit_events', 'DELETE')" | grep -qx 't'

psql "$AUDIT_HASH_PG_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/073_audit_events_privilege_hardening.sql
psql "$AUDIT_HASH_PG_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/074_design_partner_lifecycle_audit_list_v2.sql
npx vitest run lib/verification/auditEventHash.sqlParity.test.ts
