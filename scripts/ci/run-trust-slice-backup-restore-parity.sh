#!/usr/bin/env bash
# FILE: scripts/ci/run-trust-slice-backup-restore-parity.sh
# Disposable proof: pg_dump trust slice → delete → restore → relationship fingerprint.
set -euo pipefail

: "${TRUST_SLICE_BACKUP_PG_URL:?TRUST_SLICE_BACKUP_PG_URL is required}"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"
export PARITY_REPO_ROOT="$ROOT_DIR"
# shellcheck source=scripts/ci/lib/postgres-client-16.sh
. "$ROOT_DIR/scripts/ci/lib/postgres-client-16.sh"

DUMP_FILE="$(mktemp /tmp/trust_slice_backup_XXXXXX.sql)"
cleanup() { rm -f "$DUMP_FILE"; }
trap cleanup EXIT

if [ -z "${POSTGRES_CLIENT_DOCKER_IMAGE:-}" ]; then
  postgres_report_versions "$TRUST_SLICE_BACKUP_PG_URL"
  postgres_assert_client_major_matches_server "$TRUST_SLICE_BACKUP_PG_URL"
fi

TABLES=(
  public.decision_receipts
  public.verification_decisions
  public.decision_receipt_evidence_dependencies
  public.decision_receipt_revocation_events
  public.reusable_eligibility_facts
  public.reusable_eligibility_derivations
)

for table in "${TABLES[@]}"; do
  if ! parity_psql "$TRUST_SLICE_BACKUP_PG_URL" -q -t -A -c "select to_regclass('${table}');" | grep -q .; then
    echo "trust_slice_table_missing: ${table}" >&2
    exit 1
  fi
done

FINGERPRINT_SQL="
  SELECT json_build_object(
    'receipts', (SELECT coalesce(json_agg(row_to_json(r) ORDER BY r.id), '[]'::json) FROM (
      SELECT id, schema_version, status, payload_hash, signature, signing_key_id FROM public.decision_receipts ORDER BY id
    ) r),
    'evidence_deps', (SELECT coalesce(json_agg(row_to_json(d) ORDER BY d.receipt_id, d.dependency_type), '[]'::json) FROM (
      SELECT receipt_id, dependency_type, fact_id, source_credential_id FROM public.decision_receipt_evidence_dependencies
    ) d),
    'revocations', (SELECT coalesce(json_agg(row_to_json(v) ORDER BY v.receipt_id), '[]'::json) FROM (
      SELECT receipt_id, reason_code, changed_by FROM public.decision_receipt_revocation_events
    ) v),
    'derivations', (SELECT coalesce(json_agg(row_to_json(x) ORDER BY x.derived_receipt_id), '[]'::json) FROM (
      SELECT derived_receipt_id, source_receipt_id, fact_id FROM public.reusable_eligibility_derivations
    ) x)
  )::text;
"

BEFORE_FP="$(parity_psql "$TRUST_SLICE_BACKUP_PG_URL" -q -t -A -c "$FINGERPRINT_SQL")"

parity_pg_dump "$TRUST_SLICE_BACKUP_PG_URL" \
  --data-only \
  --table=public.decision_receipts \
  --table=public.verification_decisions \
  --table=public.decision_receipt_evidence_dependencies \
  --table=public.decision_receipt_revocation_events \
  --table=public.reusable_eligibility_facts \
  --table=public.reusable_eligibility_derivations \
  --no-owner \
  --no-privileges \
  --file="$DUMP_FILE"

parity_psql "$TRUST_SLICE_BACKUP_PG_URL" -v ON_ERROR_STOP=1 -c "
  DELETE FROM public.decision_receipt_revocation_events;
  DELETE FROM public.decision_receipt_evidence_dependencies;
  DELETE FROM public.reusable_eligibility_derivations;
  DELETE FROM public.reusable_eligibility_facts;
  DELETE FROM public.decision_receipts;
  DELETE FROM public.verification_decisions;
"

parity_psql "$TRUST_SLICE_BACKUP_PG_URL" -v ON_ERROR_STOP=1 -f "$DUMP_FILE"

AFTER_FP="$(parity_psql "$TRUST_SLICE_BACKUP_PG_URL" -q -t -A -c "$FINGERPRINT_SQL")"
test "$BEFORE_FP" = "$AFTER_FP"

echo "trust_slice_backup_restore_ok fingerprint_match=1 pg_dump=$(parity_pg_dump --version | tr -d '\n')"
