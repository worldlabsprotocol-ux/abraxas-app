#!/usr/bin/env bash
# FILE: scripts/ci/run-migration-081-sql-parity.sh
# Verifies migration 081 applies cleanly after the canonical prerequisite chain.

set -euo pipefail

: "${MIGRATION_081_PG_URL:?MIGRATION_081_PG_URL is required}"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

psql "$MIGRATION_081_PG_URL" -v ON_ERROR_STOP=1 -f scripts/ci/migration-076-sequential-bootstrap.sql
bash scripts/ci/apply-identity-review-prerequisite-migrations.sh "$MIGRATION_081_PG_URL"
psql "$MIGRATION_081_PG_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/049_good_trouble_cannabis_pilot.sql
sed 's|^//.*||' supabase/migrations/050_good_trouble_biometric_thresholds.sql | psql "$MIGRATION_081_PG_URL" -v ON_ERROR_STOP=1 -f -
psql "$MIGRATION_081_PG_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/050_identity_review_workflow.sql
psql "$MIGRATION_081_PG_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/078_age_evidence_records.sql
psql "$MIGRATION_081_PG_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/079_identity_review_sessions.sql
psql "$MIGRATION_081_PG_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/080_age_assurance_sessions.sql
psql "$MIGRATION_081_PG_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/055_policy_immutable_versions.sql
psql "$MIGRATION_081_PG_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/081_self_attestation_ledger.sql
psql "$MIGRATION_081_PG_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/081_self_attestation_ledger.sql

psql "$MIGRATION_081_PG_URL" -v ON_ERROR_STOP=1 -c "
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'self_attestation_ledger'
  ) AS self_attestation_ledger_exists;

  SELECT count(*)::int AS browse_policy_rows
    FROM public.partner_policies
   WHERE id = 'good-trouble-browse-v1'
     AND version = 1;
"

npx vitest run lib/goodTrouble/migration081SelfAttestationLedger.sqlParity.test.ts
