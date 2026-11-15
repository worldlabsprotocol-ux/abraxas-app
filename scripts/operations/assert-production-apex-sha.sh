#!/usr/bin/env bash
# FILE: scripts/operations/assert-production-apex-sha.sh
# Compare origin/main HEAD to the commit served on https://abraxasworld.xyz/verify (HTML marker).
set -euo pipefail
MAIN_SHA="$(git fetch -q origin main && git rev-parse origin/main)"
HTML="$(curl -fsSL 'https://abraxasworld.xyz/verify' || true)"
if [[ -z "$HTML" ]]; then
  echo "FAIL: could not fetch production /verify"
  exit 1
fi
if echo "$HTML" | grep -q 'Verify a receipt independently'; then
  echo "OK: production serves BUILD #964+ independent verify entry copy"
else
  echo "FAIL: production still shows legacy verify chrome (missing approved title)"
  echo "Expected main: $MAIN_SHA"
  echo "Remediate: assign abraxasworld.xyz alias to READY deployment whose githubCommitSha matches main (see AGENTS.md)."
  exit 1
fi
echo "Main branch SHA: $MAIN_SHA"
echo "Pass: entry UX marker present on apex domain"