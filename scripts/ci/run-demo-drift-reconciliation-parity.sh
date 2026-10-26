#!/usr/bin/env bash
# FILE: scripts/ci/run-demo-drift-reconciliation-parity.sh
# Simulate Demo drift (093 without 059), apply minimum corrective SQL, prove receipt fingerprint stable.
set -euo pipefail

: "${DEMO_DRIFT_PG_URL:?DEMO_DRIFT_PG_URL is required}"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

ADMIN_URL="${DEMO_DRIFT_ADMIN_PG_URL:-postgresql://postgres:postgres@127.0.0.1:5432/postgres}"
DB_NAME="$(echo "$DEMO_DRIFT_PG_URL" | sed -E 's|.*/||')"
psql "$ADMIN_URL" -v ON_ERROR_STOP=1 -tc "SELECT 1 FROM pg_database WHERE datname = '${DB_NAME}'" | grep -q 1 \
  || psql "$ADMIN_URL" -v ON_ERROR_STOP=1 -c "CREATE DATABASE \"${DB_NAME}\";"

psql "$DEMO_DRIFT_PG_URL" -v ON_ERROR_STOP=1 -f scripts/ci/migration-153-parity-bootstrap.sql
psql "$DEMO_DRIFT_PG_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/033_decision_receipts.sql
psql "$DEMO_DRIFT_PG_URL" -v ON_ERROR_STOP=1 -f scripts/ci/migration-evidence-chain-stubs.sql
psql "$DEMO_DRIFT_PG_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/034_credential_status_registry.sql

# Demo drift: 093 applied without 059 (matches ocntwbxarpjeixdnzide shape).
psql "$DEMO_DRIFT_PG_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/093_reusable_eligibility_facts.sql

test "$(psql "$DEMO_DRIFT_PG_URL" -q -t -A -c "select to_regclass('public.reusable_eligibility_facts') is not null;")" = "t"
test "$(psql "$DEMO_DRIFT_PG_URL" -q -t -A -c "select to_regclass('public.decision_receipt_revocation_events') is null;")" = "t"

# Seed representative Demo-shaped v1.0.0 receipts (public ids only; synthetic crypto fields).
psql "$DEMO_DRIFT_PG_URL" -v ON_ERROR_STOP=1 <<'SEED'
INSERT INTO public.verification_decisions (id) VALUES
  ('11111111-1111-4111-8111-111111111111'),
  ('22222222-2222-4222-8222-222222222222')
ON CONFLICT DO NOTHING;

INSERT INTO public.decision_receipts (
  id, verification_decision_id, partner_id, policy_id, policy_version,
  subject_pseudonym_id, decision_result, evaluated_at, status, schema_version,
  payload_hash, signature, signing_key_id
) VALUES
  ('dr_demoDriftA', '11111111-1111-4111-8111-111111111111', 'partner_demo', 'policy_demo', 1,
   'subj_a', 'approved', now(), 'active', '1.0.0', 'hash-demo-a', 'sig-demo-a', 'key-demo'),
  ('dr_demoDriftB', '22222222-2222-4222-8222-222222222222', 'partner_demo', 'policy_demo', 1,
   'subj_b', 'approved', now(), 'active', '1.0.0', 'hash-demo-b', 'sig-demo-b', 'key-demo')
ON CONFLICT (id) DO NOTHING;
SEED

FINGERPRINT="$(psql "$DEMO_DRIFT_PG_URL" -q -t -A -c "
  SELECT coalesce(json_agg(row_to_json(t) ORDER BY t.id), '[]'::json)::text
  FROM (
    SELECT id, schema_version, status, payload_hash, signature, signing_key_id
    FROM public.decision_receipts ORDER BY id
  ) t;
")"

# Minimum corrective sequence (skip 093 recreate — already present).
psql "$DEMO_DRIFT_PG_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/059_decision_receipt_revocation_events.sql
psql "$DEMO_DRIFT_PG_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/113_decision_receipt_evidence_dependencies.sql

# Idempotent 093 re-apply must not mutate receipt rows.
psql "$DEMO_DRIFT_PG_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/093_reusable_eligibility_facts.sql

AFTER_FP="$(psql "$DEMO_DRIFT_PG_URL" -q -t -A -c "
  SELECT coalesce(json_agg(row_to_json(t) ORDER BY t.id), '[]'::json)::text
  FROM (
    SELECT id, schema_version, status, payload_hash, signature, signing_key_id
    FROM public.decision_receipts ORDER BY id
  ) t;
")"

test "$FINGERPRINT" = "$AFTER_FP"

psql "$DEMO_DRIFT_PG_URL" -q -t -A -c "
  SELECT proname FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND proname = 'revoke_decision_receipt_atomic';
" | grep -q revoke_decision_receipt_atomic

export DEMO_DRIFT_PG_URL
npx vitest run lib/decisionReceipts/demoDriftReconciliation.sqlParity.test.ts

echo "demo_drift_reconciliation_ok fingerprint_match=1"
