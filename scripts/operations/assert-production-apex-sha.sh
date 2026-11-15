#!/usr/bin/env bash
# FILE: scripts/operations/assert-production-apex-sha.sh
# Assert https://abraxasworld.xyz serves origin/main via /api/public/deployment git_commit_sha.
set -euo pipefail

ORIGIN="${PRODUCTION_ORIGIN:-https://abraxasworld.xyz}"
MAIN_SHA="$(git fetch -q origin main && git rev-parse origin/main)"

RELEASE_JSON="$(curl -fsSL "${ORIGIN}/api/public/deployment" || true)"
if [[ -z "$RELEASE_JSON" ]]; then
  echo "FAIL: could not fetch ${ORIGIN}/api/public/deployment"
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "FAIL: jq required for deployment SHA comparison"
  exit 1
fi

REMOTE_SHA="$(echo "$RELEASE_JSON" | jq -r '.git_commit_sha // empty')"
if [[ -z "$REMOTE_SHA" || "$REMOTE_SHA" == "null" ]]; then
  echo "FAIL: deployment response missing git_commit_sha (not running on Vercel build?)"
  echo "$RELEASE_JSON"
  exit 1
fi

if [[ "$REMOTE_SHA" != "$MAIN_SHA" ]]; then
  echo "FAIL: production commit mismatch"
  echo "  origin/main:     $MAIN_SHA"
  echo "  apex deployment: $REMOTE_SHA"
  echo "Remediate: assign ${ORIGIN#https://} alias to READY deployment for $MAIN_SHA (see AGENTS.md)."
  exit 1
fi

HTML="$(curl -fsSL "${ORIGIN}/verify" || true)"
if ! echo "$HTML" | grep -q 'Verify a receipt independently'; then
  echo "FAIL: apex /verify missing approved independent-verify entry copy"
  exit 1
fi

echo "PASS: apex deployment git_commit_sha matches origin/main ($MAIN_SHA)"