#!/usr/bin/env bash
# FILE: scripts/ci/run-migration-079-sql-parity.sh
# Verifies migration 079 applies cleanly after 078 bootstrap.

set -euo pipefail

: "${MIGRATION_079_PG_URL:?MIGRATION_079_PG_URL is required}"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

psql "$MIGRATION_079_PG_URL" -v ON_ERROR_STOP=1 -f scripts/ci/migration-076-sequential-bootstrap.sql
psql "$MIGRATION_079_PG_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/049_good_trouble_cannabis_pilot.sql
sed 's|^//.*||' supabase/migrations/050_good_trouble_biometric_thresholds.sql | psql "$MIGRATION_079_PG_URL" -v ON_ERROR_STOP=1 -f -
psql "$MIGRATION_079_PG_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/050_identity_review_workflow.sql
psql "$MIGRATION_079_PG_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/078_age_evidence_records.sql
psql "$MIGRATION_079_PG_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/079_identity_review_sessions.sql

psql "$MIGRATION_079_PG_URL" -v ON_ERROR_STOP=1 -c "
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'identity_review_sessions'
  ) AS identity_review_sessions_exists;
"

npx vitest run lib/goodTrouble/migration079IdentityReviewSessions.sqlParity.test.ts
