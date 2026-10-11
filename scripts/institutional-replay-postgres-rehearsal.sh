#!/usr/bin/env bash
# Isolated PostgreSQL rehearsal for migration 139/140 institutional replay RPC.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ARTIFACT_DIR="/opt/cursor/artifacts/institutional-replay-postgres"
DB_NAME="abraxas524_replay"
DB_USER="abraxas524"
DB_PASS="local_replay_rehearsal_only"
export PGPASSWORD="$DB_PASS"

mkdir -p "$ARTIFACT_DIR"

echo "=== Build #524 institutional replay Postgres rehearsal ===" | tee "$ARTIFACT_DIR/rehearsal.log"

if ! command -v psql >/dev/null; then
  echo "SKIP: psql not available" | tee "$ARTIFACT_DIR/verdict.txt"
  exit 0
fi

sudo service postgresql start >/dev/null 2>&1 || true

sudo -u postgres psql -v ON_ERROR_STOP=1 -tc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'" | grep -q 1 \
  || sudo -u postgres psql -v ON_ERROR_STOP=1 -c "CREATE ROLE ${DB_USER} LOGIN PASSWORD '${DB_PASS}';"

sudo -u postgres psql -v ON_ERROR_STOP=1 -tc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1 \
  || sudo -u postgres psql -v ON_ERROR_STOP=1 -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};"

sudo -u postgres psql -d "$DB_NAME" -v ON_ERROR_STOP=1 -f "$ROOT/supabase/migrations/139_institutional_eligibility_consume_nonces.sql" >> "$ARTIFACT_DIR/rehearsal.log" 2>&1
sudo -u postgres psql -d "$DB_NAME" -v ON_ERROR_STOP=1 -f "$ROOT/supabase/migrations/140_institutional_replay_rpc_hardening.sql" >> "$ARTIFACT_DIR/rehearsal.log" 2>&1

sudo -u postgres psql -d "$DB_NAME" -v ON_ERROR_STOP=1 -c \
  "GRANT EXECUTE ON FUNCTION public.institutional_eligibility_consume_nonce(text,text,text,text,text,integer,text,text,timestamptz) TO ${DB_USER};"

sudo -u postgres psql -d "$DB_NAME" -v ON_ERROR_STOP=1 -c \
  "DO \$\$ BEGIN CREATE ROLE service_role NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END \$\$;"

psql -h localhost -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 -c \
  "SELECT has_table_privilege('service_role', 'public.institutional_eligibility_consume_nonces', 'INSERT') AS service_role_insert_allowed;" \
  | tee "$ARTIFACT_DIR/service_role_insert_privilege.txt"

export INSTITUTIONAL_REPLAY_TEST_DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@localhost:5432/${DB_NAME}"
npm run test:institutional-replay-postgres >> "$ARTIFACT_DIR/rehearsal.log" 2>&1

echo "REHEARSAL_PASS" | tee "$ARTIFACT_DIR/verdict.txt"
