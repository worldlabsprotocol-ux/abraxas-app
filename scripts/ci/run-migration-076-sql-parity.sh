#!/usr/bin/env bash
# FILE: scripts/ci/run-migration-076-sql-parity.sh
# Fresh sequential bootstrap (049→076) + production-like P0001 regression via vitest.

set -euo pipefail

: "${MIGRATION_076_PG_URL:?MIGRATION_076_PG_URL is required}"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

psql "$MIGRATION_076_PG_URL" -v ON_ERROR_STOP=1 -f scripts/ci/migration-076-sequential-bootstrap.sql
psql "$MIGRATION_076_PG_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/049_good_trouble_cannabis_pilot.sql
sed 's|^//.*||' supabase/migrations/050_good_trouble_biometric_thresholds.sql | psql "$MIGRATION_076_PG_URL" -v ON_ERROR_STOP=1 -f -
psql "$MIGRATION_076_PG_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/051_good_trouble_partner_return_urls.sql
psql "$MIGRATION_076_PG_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/055_policy_immutable_versions.sql
psql "$MIGRATION_076_PG_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/075_good_trouble_retail_age_eligibility_claim.sql
psql "$MIGRATION_076_PG_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/076_good_trouble_retail_product_eligibility_draft.sql
npx vitest run lib/goodTrouble/migration076ProductEligibilityDraft.sqlParity.test.ts
