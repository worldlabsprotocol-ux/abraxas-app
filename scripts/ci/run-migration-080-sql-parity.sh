#!/usr/bin/env bash
# FILE: scripts/ci/run-migration-080-sql-parity.sh
# Verifies migration 080 applies cleanly after 079 bootstrap.

set -euo pipefail

: "${MIGRATION_080_PG_URL:?MIGRATION_080_PG_URL is required}"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

psql "$MIGRATION_080_PG_URL" -v ON_ERROR_STOP=1 -f scripts/ci/migration-076-sequential-bootstrap.sql
psql "$MIGRATION_080_PG_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/049_good_trouble_cannabis_pilot.sql
sed 's|^//.*||' supabase/migrations/050_good_trouble_biometric_thresholds.sql | psql "$MIGRATION_080_PG_URL" -v ON_ERROR_STOP=1 -f -
psql "$MIGRATION_080_PG_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/050_identity_review_workflow.sql
psql "$MIGRATION_080_PG_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/078_age_evidence_records.sql
psql "$MIGRATION_080_PG_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/079_identity_review_sessions.sql
psql "$MIGRATION_080_PG_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/080_age_assurance_sessions.sql

psql "$MIGRATION_080_PG_URL" -v ON_ERROR_STOP=1 -c "
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'age_assurance_sessions'
  ) AS age_assurance_sessions_exists;
"

npx vitest run lib/goodTrouble/migration080AgeAssuranceSessions.sqlParity.test.ts
