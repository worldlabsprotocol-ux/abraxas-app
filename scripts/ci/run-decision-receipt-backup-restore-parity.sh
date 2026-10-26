#!/usr/bin/env bash
# FILE: scripts/ci/run-decision-receipt-backup-restore-parity.sh
# Disposable proof: pg_dump decision_receipts → restore → row count parity (no Demo/Prod touch).
set -euo pipefail

: "${RECEIPT_BACKUP_PG_URL:?RECEIPT_BACKUP_PG_URL is required}"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"
DUMP_FILE="/tmp/decision_receipts_backup_$$.sql"

if ! psql "$RECEIPT_BACKUP_PG_URL" -q -t -A -c "select to_regclass('public.decision_receipts');" | grep -q decision_receipts; then
  psql "$RECEIPT_BACKUP_PG_URL" -v ON_ERROR_STOP=1 -f scripts/ci/migration-153-parity-bootstrap.sql
  psql "$RECEIPT_BACKUP_PG_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/033_decision_receipts.sql
fi

DECISION_ID="$(psql "$RECEIPT_BACKUP_PG_URL" -q -t -A -c "insert into public.verification_decisions default values returning id;")"
psql "$RECEIPT_BACKUP_PG_URL" -v ON_ERROR_STOP=1 -c "
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
  );
"

BEFORE="$(psql "$RECEIPT_BACKUP_PG_URL" -q -t -A -c "select count(*)::int from public.decision_receipts;")"
pg_dump "$RECEIPT_BACKUP_PG_URL" --data-only --table=public.decision_receipts --no-owner --no-privileges -f "$DUMP_FILE"

psql "$RECEIPT_BACKUP_PG_URL" -v ON_ERROR_STOP=1 -c "DELETE FROM public.decision_receipts;"
AFTER_DELETE="$(psql "$RECEIPT_BACKUP_PG_URL" -q -t -A -c "select count(*)::int from public.decision_receipts;")"
test "$AFTER_DELETE" = "0"

psql "$RECEIPT_BACKUP_PG_URL" -v ON_ERROR_STOP=1 -f "$DUMP_FILE"
AFTER_RESTORE="$(psql "$RECEIPT_BACKUP_PG_URL" -q -t -A -c "select count(*)::int from public.decision_receipts;")"
test "$BEFORE" = "$AFTER_RESTORE"

rm -f "$DUMP_FILE"
echo "backup_restore_parity_ok rows=${AFTER_RESTORE}"
