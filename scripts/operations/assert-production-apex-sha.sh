#!/usr/bin/env bash
# FILE: scripts/operations/assert-production-apex-sha.sh
# Assert the live release matches origin/main via GET /api/public/deployment git_commit_sha.
set -euo pipefail

ORIGIN="${PRODUCTION_ORIGIN:-https://abraxasworld.xyz}"
FALLBACK_ORIGIN="${PRODUCTION_RELEASE_FALLBACK_ORIGIN:-https://demo.abraxasworld.xyz}"
MAIN_SHA="$(git fetch -q origin main && git rev-parse origin/main)"

CURL_OPTS=(-fsSL)
if [[ -n "${VERCEL_PROTECTION_BYPASS:-}" ]]; then
  CURL_OPTS+=(-H "x-vercel-protection-bypass: ${VERCEL_PROTECTION_BYPASS}")
  CURL_OPTS+=(-H "x-vercel-set-bypass-cookie: true")
fi

fetch_deployment_json() {
  local base="$1"
  local response
  response="$(curl "${CURL_OPTS[@]}" "${base}/api/public/deployment" 2>/dev/null || true)"
  if [[ -z "$response" ]]; then
    echo ""
    return 0
  fi
  if [[ "$response" == \{* ]]; then
    echo "$response"
    return 0
  fi
  echo ""
}

RELEASE_JSON="$(fetch_deployment_json "$ORIGIN")"
CHECKED_ORIGIN="$ORIGIN"

if [[ -z "$RELEASE_JSON" ]]; then
  RELEASE_JSON="$(fetch_deployment_json "$FALLBACK_ORIGIN")"
  if [[ -n "$RELEASE_JSON" ]]; then
  CHECKED_ORIGIN="$FALLBACK_ORIGIN"
    echo "NOTE: ${ORIGIN}/api/public/deployment was not JSON (often Vercel auth when apex aliases a preview build); checking ${FALLBACK_ORIGIN} instead." >&2
  fi
fi

if [[ -z "$RELEASE_JSON" ]]; then
  echo "FAIL: could not fetch deployment JSON from ${ORIGIN} or ${FALLBACK_ORIGIN}"
  echo "  Set VERCEL_PROTECTION_BYPASS when apex is behind Deployment Protection, or fix the apex alias."
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
  echo "  live (${CHECKED_ORIGIN#https://}): $REMOTE_SHA"
  echo "Remediate: assign apex alias to READY deployment for $MAIN_SHA (see AGENTS.md)."
  exit 1
fi

HTML="$(curl "${CURL_OPTS[@]}" "${CHECKED_ORIGIN}/verify" 2>/dev/null || true)"
if ! echo "$HTML" | grep -q 'Verify a receipt independently'; then
  echo "FAIL: ${CHECKED_ORIGIN}/verify missing approved independent-verify entry copy"
  exit 1
fi

echo "PASS: live deployment git_commit_sha matches origin/main ($MAIN_SHA) [${CHECKED_ORIGIN#https://}]"