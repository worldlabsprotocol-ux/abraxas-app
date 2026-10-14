#!/usr/bin/env bash
# Unit + optional disposable integration for Build #552 database recovery.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
exec ./node_modules/.bin/vitest run lib/databaseRecovery/
