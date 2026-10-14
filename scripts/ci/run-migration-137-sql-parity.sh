#!/usr/bin/env bash
# Optional CI/local: apply migration 137 on disposable Postgres (never shared staging/Production).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
if [[ -z "${MIGRATION_137_PG_URL:-}" && -z "${MIGRATION_136_PG_URL:-}" && -z "${ABRAXAS_DATABASE_URL:-}" && -z "${DATABASE_URL:-}" ]]; then
  echo "skip: set MIGRATION_137_PG_URL or MIGRATION_136_PG_URL to run migration 137 parity"
  exit 0
fi
exec ./node_modules/.bin/vitest run lib/institutionalCertification/migration137.sqlParity.test.ts
