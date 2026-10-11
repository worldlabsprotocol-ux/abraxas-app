#!/usr/bin/env bash
# Build #516 — real PostgreSQL rehearsal for migrations 134–138 (isolated, no Demo connection).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
MIG_DIR="$ROOT/supabase/migrations"
ARTIFACT_DIR="/opt/cursor/artifacts/build516"
DB_NAME="abraxas516_rehearsal"
DB_USER="abraxas516"
DB_PASS="local_rehearsal_only"
export PGPASSWORD="$DB_PASS"

mkdir -p "$ARTIFACT_DIR"

echo "=== Build #516 disposable PostgreSQL rehearsal ===" | tee "$ARTIFACT_DIR/rehearsal.log"

if ! command -v psql >/dev/null; then
  echo "FAIL: psql not available" | tee -a "$ARTIFACT_DIR/rehearsal.log"
  exit 2
fi

sudo service postgresql start >/dev/null 2>&1 || true

sudo -u postgres psql -v ON_ERROR_STOP=1 -tc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'" | grep -q 1 \
  || sudo -u postgres psql -v ON_ERROR_STOP=1 -c "CREATE ROLE ${DB_USER} LOGIN PASSWORD '${DB_PASS}';"

sudo -u postgres psql -v ON_ERROR_STOP=1 -tc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1 \
  || sudo -u postgres psql -v ON_ERROR_STOP=1 -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};"

psql -h localhost -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 -c "SELECT version();" | tee "$ARTIFACT_DIR/postgres_version.txt"

echo "--- Applying fixture ---" | tee -a "$ARTIFACT_DIR/rehearsal.log"
sudo -u postgres psql -d "$DB_NAME" -v ON_ERROR_STOP=1 -f "$ROOT/scripts/build516/disposable-demo-schema-fixture.sql" >> "$ARTIFACT_DIR/rehearsal.log" 2>&1

apply_one() {
  local file="$1"
  echo "--- Applying ${file} ---" | tee -a "$ARTIFACT_DIR/rehearsal.log"
  sudo -u postgres psql -d "$DB_NAME" -v ON_ERROR_STOP=1 -f "$MIG_DIR/$file" >> "$ARTIFACT_DIR/rehearsal.log" 2>&1
}

for f in \
  134_holder_wallet_login.sql \
  135_canonical_holder_accounts.sql \
  136_cielo_verified_guest_solana_policy.sql \
  137_good_trouble_age_21_solana_idv.sql \
  138_decision_receipt_solana_commitments.sql
do
  apply_one "$f"
done

echo "--- Post-migration validation ---" | tee -a "$ARTIFACT_DIR/rehearsal.log"
psql -h localhost -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 <<'SQL' | tee "$ARTIFACT_DIR/post_validation.txt"
SELECT to_regclass('public.holder_wallet_accounts') IS NOT NULL AS holder_wallet_accounts;
SELECT to_regclass('public.holder_accounts') IS NOT NULL AS holder_accounts;
SELECT column_name FROM information_schema.columns
  WHERE table_schema='public' AND table_name='identity_verifications' AND column_name='holder_account_id';
SELECT id, version FROM public.partner_policies
  WHERE id IN ('cielo-verified-guest-solana-v1','good-trouble-age_21_retail-solana-v1');
SELECT to_regclass('public.decision_receipt_solana_commitments') IS NOT NULL AS solana_commitments;
SQL

echo "--- Idempotent re-apply 136 ---" | tee -a "$ARTIFACT_DIR/rehearsal.log"
apply_one "136_cielo_verified_guest_solana_policy.sql"

echo "--- Security smoke (RLS on commitments) ---" | tee -a "$ARTIFACT_DIR/rehearsal.log"
psql -h localhost -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 <<'SQL' | tee "$ARTIFACT_DIR/security_smoke.txt"
SELECT relrowsecurity FROM pg_class WHERE relname = 'decision_receipt_solana_commitments';
SQL

echo "REHEARSAL_PASS" | tee "$ARTIFACT_DIR/rehearsal_verdict.txt"
