#!/usr/bin/env bash
# FILE: scripts/operations/vercel-ignored-build-step.test.sh
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# Vercel must exit 1 to proceed with the build.
set +e
bash "$ROOT/scripts/operations/vercel-ignored-build-step.sh"
code=$?
set -e
if [[ "$code" -ne 1 ]]; then
  echo "FAIL: expected exit 1 (build), got $code"
  exit 1
fi
echo "PASS: vercel-ignored-build-step exits 1 (build proceeds)"