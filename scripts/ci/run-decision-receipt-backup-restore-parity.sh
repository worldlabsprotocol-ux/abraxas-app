#!/usr/bin/env bash
# FILE: scripts/ci/run-decision-receipt-backup-restore-parity.sh
# Disposable proof: pg_dump decision_receipts → restore → cryptographic row parity.
# NEVER run against Demo or Production — CI/disposable Postgres only.
set -euo pipefail

: "${RECEIPT_BACKUP_PG_URL:?RECEIPT_BACKUP_PG_URL is required}"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"
export PARITY_REPO_ROOT="$ROOT_DIR"
# shellcheck source=scripts/ci/lib/postgres-client-16.sh
. "$ROOT_DIR/scripts/ci/lib/postgres-client-16.sh"

DUMP_FILE="$(mktemp /tmp/decision_receipts_backup_XXXXXX.sql)"
cleanup() { rm -f "$DUMP_FILE"; }
trap cleanup EXIT

postgres_report_versions "$RECEIPT_BACKUP_PG_URL"
postgres_assert_client_major_matches_server "$RECEIPT_BACKUP_PG_URL"

if ! parity_psql "$RECEIPT_BACKUP_PG_URL" -q -t -A -c "select to_regclass('public.decision_receipts');" | grep -q decision_receipts; then
  parity_psql "$RECEIPT_BACKUP_PG_URL" -v ON_ERROR_STOP=1 -f "$ROOT_DIR/scripts/ci/migration-153-parity-bootstrap.sql"
  parity_psql "$RECEIPT_BACKUP_PG_URL" -v ON_ERROR_STOP=1 -f "$ROOT_DIR/supabase/migrations/033_decision_receipts.sql"
fi

HAS_V152="$(parity_psql "$RECEIPT_BACKUP_PG_URL" -q -t -A -c "
  select count(*)::int from information_schema.columns
  where table_schema = 'public' and table_name = 'decision_receipts'
    and column_name = 'application_binding_ref';
")"

DECISION_ID="$(parity_psql "$RECEIPT_BACKUP_PG_URL" -q -t -A -c "insert into public.verification_decisions default values returning id;")"
parity_psql "$RECEIPT_BACKUP_PG_URL" -v ON_ERROR_STOP=1 -c "
  INSERT INTO public.decision_receipts (
    id, verification_decision_id, partner_id, policy_id, policy_version,
    subject_pseudonym_id, decision_result, evaluated_at, status, schema_version,
    payload_hash, signature, signing_key_id
  ) VALUES (
    'dr_backupRestoreParity1',
    '${DECISION_ID}'::uuid,
    'partner_backup',
    'policy_backup',
    1,
    'subj_backup',
    'approved',
    now(),
    'active',
    '1.0.0',
    'hash-backup-test',
    'sig-backup-test',
    'key-backup'
  )
  ON CONFLICT (id) DO UPDATE SET
    payload_hash = EXCLUDED.payload_hash,
    signature = EXCLUDED.signature,
    schema_version = EXCLUDED.schema_version,
    status = EXCLUDED.status;
"

FINGERPRINT_SQL="
  SELECT coalesce(json_agg(row_to_json(t) ORDER BY t.id), '[]'::json)::text
  FROM (
    SELECT
      id,
      schema_version,
      status,
      payload_hash,
      signature,
      signing_key_id,
      application_binding_ref,
      evidence_commitment,
      evidence_commitment_manifest,
      v11_issuance_phase
    FROM public.decision_receipts
    ORDER BY id
  ) t;
"

if [ "$HAS_V152" = "0" ]; then
  FINGERPRINT_SQL="
    SELECT coalesce(json_agg(row_to_json(t) ORDER BY t.id), '[]'::json)::text
    FROM (
      SELECT id, schema_version, status, payload_hash, signature, signing_key_id
      FROM public.decision_receipts
      ORDER BY id
    ) t;
  "
fi

BEFORE_FP="$(parity_psql "$RECEIPT_BACKUP_PG_URL" -q -t -A -c "$FINGERPRINT_SQL")"
BEFORE_COUNT="$(parity_psql "$RECEIPT_BACKUP_PG_URL" -q -t -A -c "select count(*)::int from public.decision_receipts;")"

parity_pg_dump "$RECEIPT_BACKUP_PG_URL" \
  --data-only \
  --table=public.decision_receipts \
  --no-owner \
  --no-privileges \
  --file="$DUMP_FILE"

parity_psql "$RECEIPT_BACKUP_PG_URL" -v ON_ERROR_STOP=1 -c "DELETE FROM public.decision_receipts;"
AFTER_DELETE="$(parity_psql "$RECEIPT_BACKUP_PG_URL" -q -t -A -c "select count(*)::int from public.decision_receipts;")"
test "$AFTER_DELETE" = "0"

parity_psql "$RECEIPT_BACKUP_PG_URL" -v ON_ERROR_STOP=1 -f "$DUMP_FILE"

AFTER_FP="$(parity_psql "$RECEIPT_BACKUP_PG_URL" -q -t -A -c "$FINGERPRINT_SQL")"
AFTER_COUNT="$(parity_psql "$RECEIPT_BACKUP_PG_URL" -q -t -A -c "select count(*)::int from public.decision_receipts;")"

test "$BEFORE_COUNT" = "$AFTER_COUNT"
test "$BEFORE_FP" = "$AFTER_FP"

parity_psql "$RECEIPT_BACKUP_PG_URL" -q -t -A -c "
  SELECT id FROM public.decision_receipts WHERE id = 'dr_backupRestoreParity1';
" | grep -q dr_backupRestoreParity1

echo "backup_restore_parity_ok rows=${AFTER_COUNT} fingerprint_match=1 pg_dump=$(parity_pg_dump --version | tr -d '\n')"
