#!/usr/bin/env bash
# FILE: scripts/ci/run-migration-078-sql-parity.sh
# Verifies migration 078 applies cleanly after 076 bootstrap and is backward-compatible.

set -euo pipefail

: "${MIGRATION_078_PG_URL:?MIGRATION_078_PG_URL is required}"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

psql "$MIGRATION_078_PG_URL" -v ON_ERROR_STOP=1 -f scripts/ci/migration-076-sequential-bootstrap.sql
psql "$MIGRATION_078_PG_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/049_good_trouble_cannabis_pilot.sql
sed 's|^//.*||' supabase/migrations/050_good_trouble_biometric_thresholds.sql | psql "$MIGRATION_078_PG_URL" -v ON_ERROR_STOP=1 -f -
psql "$MIGRATION_078_PG_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/051_good_trouble_partner_return_urls.sql
psql "$MIGRATION_078_PG_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/055_policy_immutable_versions.sql
psql "$MIGRATION_078_PG_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/075_good_trouble_retail_age_eligibility_claim.sql
psql "$MIGRATION_078_PG_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/076_good_trouble_retail_product_eligibility_draft.sql
psql "$MIGRATION_078_PG_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/078_age_evidence_records.sql

psql "$MIGRATION_078_PG_URL" -v ON_ERROR_STOP=1 -c "
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'age_evidence_records'
  ) AS age_evidence_table_exists;
"

npx vitest run lib/goodTrouble/migration078AgeEvidence.sqlParity.test.ts
