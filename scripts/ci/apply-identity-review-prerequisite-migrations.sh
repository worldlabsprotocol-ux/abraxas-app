#!/usr/bin/env bash
# FILE: scripts/ci/apply-identity-review-prerequisite-migrations.sh
# Authoritative prerequisite migrations for 050_identity_review_workflow.sql and
# 078_age_evidence_records.sql (both reference public.passport_documents).

set -euo pipefail

: "${1:?usage: apply-identity-review-prerequisite-migrations.sh <postgres-url>}"

PG_URL="$1"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

psql "$PG_URL" -v ON_ERROR_STOP=1 -f "$ROOT_DIR/supabase/migrations/021_passport_documents_manual_idv.sql"
psql "$PG_URL" -v ON_ERROR_STOP=1 -f "$ROOT_DIR/supabase/migrations/037_biometric_assessments.sql"

psql "$PG_URL" -v ON_ERROR_STOP=1 -c "
DO \$\$
BEGIN
  IF to_regclass('public.passport_documents') IS NULL THEN
    RAISE EXCEPTION
      'parity prerequisite missing: public.passport_documents — apply 021_passport_documents_manual_idv.sql before 050_identity_review_workflow.sql';
  END IF;

  IF to_regclass('public.identity_biometric_assessments') IS NULL THEN
    RAISE EXCEPTION
      'parity prerequisite missing: public.identity_biometric_assessments — apply 037_biometric_assessments.sql before 050_identity_review_workflow.sql';
  END IF;
END \$\$;
"
