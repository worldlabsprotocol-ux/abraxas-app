#!/usr/bin/env bash
# Optional CI/local: apply migration 136 on disposable Postgres (never shared staging/Production).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
if [[ -z "${MIGRATION_136_PG_URL:-}" && -z "${ABRAXAS_DATABASE_URL:-}" && -z "${DATABASE_URL:-}" ]]; then
  echo "skip: set MIGRATION_136_PG_URL or ABRAXAS_DATABASE_URL to run migration 136 parity"
  exit 0
fi
exec ./node_modules/.bin/vitest run lib/institutionalCertification/migration136.sqlParity.test.ts
