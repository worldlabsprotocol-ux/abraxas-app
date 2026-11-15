#!/usr/bin/env bash
# FILE: scripts/operations/assert-production-apex-sha.sh
# Assert production apex and (optionally) demo release SHAs against origin/main.
# Demo success never substitutes for production PASS.
set -euo pipefail

PRODUCTION_ORIGIN="${PRODUCTION_ORIGIN:-https://abraxasworld.xyz}"
DEMO_ORIGIN="${DEMO_RELEASE_ORIGIN:-https://demo.abraxasworld.xyz}"
MAIN_SHA="$(git fetch -q origin main && git rev-parse origin/main)"

CURL_BASE=(-sS)
CURL_HEADERS=()
if [[ -n "${VERCEL_PROTECTION_BYPASS:-}" ]]; then
  CURL_HEADERS+=(-H "x-vercel-protection-bypass: ${VERCEL_PROTECTION_BYPASS}")
  CURL_HEADERS+=(-H "x-vercel-set-bypass-cookie: true")
fi

fetch_deployment_json() {
  local base="$1"
  local body_file response status

  body_file="$(mktemp)"
  status="$(
    curl "${CURL_BASE[@]}" "${CURL_HEADERS[@]}" \
      -o "$body_file" -w '%{http_code}' "${base}/api/public/deployment" 2>/dev/null || echo "000"
  )"
  response="$(cat "$body_file" 2>/dev/null || true)"
  rm -f "$body_file"

  if [[ "$response" == \{* ]]; then
    printf '%s\n' "$response"
    return 0
  fi

  if [[ "$status" == "302" || "$status" == "307" || "$status" == "401" ]]; then
    echo "__VERCEL_PROTECTION__"
    return 0
  fi

  if echo "$response" | grep -q 'vercel.com/sso-api'; then
    echo "__VERCEL_PROTECTION__"
    return 0
  fi

  echo ""
}

extract_sha() {
  local json="$1"
  if [[ "$json" == "__VERCEL_PROTECTION__" || -z "$json" ]]; then
    echo ""
    return 0
  fi
  echo "$json" | jq -r '.git_commit_sha // empty'
}

extract_vercel_env() {
  local json="$1"
  if [[ "$json" == "__VERCEL_PROTECTION__" || -z "$json" ]]; then
    echo ""
    return 0
  fi
  echo "$json" | jq -r '.vercel_env // empty'
}

verify_entry_copy() {
  local base="$1"
  local html
  html="$(curl -fsSL "${CURL_HEADERS[@]}" "${base}/verify" 2>/dev/null || true)"
  echo "$html" | grep -q 'Verify a receipt independently'
}

if ! command -v jq >/dev/null 2>&1; then
  echo "FAIL: jq required for deployment SHA comparison"
  exit 1
fi

PRODUCTION_JSON="$(fetch_deployment_json "$PRODUCTION_ORIGIN")"
PRODUCTION_SHA="$(extract_sha "$PRODUCTION_JSON")"
PRODUCTION_ENV="$(extract_vercel_env "$PRODUCTION_JSON")"
PRODUCTION_PROTECTED=false
PRODUCTION_PASS=false

echo "origin/main: $MAIN_SHA"
echo ""

if [[ "$PRODUCTION_JSON" == "__VERCEL_PROTECTION__" ]]; then
  PRODUCTION_PROTECTED=true
  echo "PRODUCTION (${PRODUCTION_ORIGIN#https://}): BLOCKED (Vercel Deployment Protection — set VERCEL_PROTECTION_BYPASS for automation)"
elif [[ -z "$PRODUCTION_JSON" ]]; then
  echo "PRODUCTION (${PRODUCTION_ORIGIN#https://}): FAIL (no JSON from /api/public/deployment)"
elif [[ -z "$PRODUCTION_SHA" || "$PRODUCTION_SHA" == "null" ]]; then
  echo "PRODUCTION (${PRODUCTION_ORIGIN#https://}): FAIL (missing git_commit_sha)"
  echo "$PRODUCTION_JSON"
elif [[ "$PRODUCTION_SHA" != "$MAIN_SHA" ]]; then
  echo "PRODUCTION (${PRODUCTION_ORIGIN#https://}): FAIL (commit mismatch)"
  echo "  apex deployment: $PRODUCTION_SHA"
  echo "  vercel_env:      ${PRODUCTION_ENV:-unknown}"
else
  if verify_entry_copy "$PRODUCTION_ORIGIN"; then
    PRODUCTION_PASS=true
    echo "PRODUCTION (${PRODUCTION_ORIGIN#https://}): PASS (git_commit_sha $PRODUCTION_SHA, vercel_env=${PRODUCTION_ENV:-unknown})"
  else
    echo "PRODUCTION (${PRODUCTION_ORIGIN#https://}): FAIL (/verify missing independent-verify entry copy)"
  fi
fi

DEMO_JSON="$(fetch_deployment_json "$DEMO_ORIGIN")"
DEMO_SHA="$(extract_sha "$DEMO_JSON")"
DEMO_ENV="$(extract_vercel_env "$DEMO_JSON")"
DEMO_PASS=false

echo ""
if [[ "$DEMO_JSON" == "__VERCEL_PROTECTION__" ]]; then
  echo "DEMO (${DEMO_ORIGIN#https://}): BLOCKED (unexpected protection on demo host)"
elif [[ -z "$DEMO_JSON" ]]; then
  echo "DEMO (${DEMO_ORIGIN#https://}): FAIL (no JSON)"
elif [[ -z "$DEMO_SHA" ]]; then
  echo "DEMO (${DEMO_ORIGIN#https://}): FAIL (missing git_commit_sha)"
elif [[ "$DEMO_SHA" != "$MAIN_SHA" ]]; then
  echo "DEMO (${DEMO_ORIGIN#https://}): FAIL (commit mismatch: $DEMO_SHA)"
else
  if verify_entry_copy "$DEMO_ORIGIN"; then
    DEMO_PASS=true
    echo "DEMO (${DEMO_ORIGIN#https://}): PASS (git_commit_sha $DEMO_SHA, vercel_env=${DEMO_ENV:-unknown})"
  else
    echo "DEMO (${DEMO_ORIGIN#https://}): FAIL (/verify missing entry copy)"
  fi
fi

echo ""
if [[ "$PRODUCTION_PASS" == true ]]; then
  echo "OVERALL: PRODUCTION PASS"
  exit 0
fi

if [[ "$PRODUCTION_PROTECTED" == true && -z "${VERCEL_PROTECTION_BYPASS:-}" ]]; then
  echo "OVERALL: PRODUCTION NOT VERIFIED (protection). Demo result is not a production substitute."
  if [[ "$DEMO_PASS" == true ]]; then
    echo "         Use demo only for founder UX testing until production is verified with bypass or a public production build."
  fi
  exit 1
fi

echo "OVERALL: PRODUCTION FAIL (demo alone does not satisfy release assertion)"
exit 1