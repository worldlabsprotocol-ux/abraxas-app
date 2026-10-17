#!/usr/bin/env bash
# Non-secret preview readiness probe for Build #730 (requires VERCEL_PROTECTION_BYPASS when SSO-protected).
set -euo pipefail

BASE_URL="${1:-${NATIVE_AUTH_BASE_URL:-}}"
if [[ -z "$BASE_URL" ]]; then
  echo "usage: preview-readiness-curl.sh <preview-base-url>" >&2
  exit 2
fi

BYPASS="${VERCEL_PROTECTION_BYPASS:-}"
HDR=()
if [[ -n "$BYPASS" ]]; then
  HDR=(-H "x-vercel-protection-bypass: $BYPASS")
fi

echo "== launchpad staging identity =="
curl -sS "${HDR[@]}" "$BASE_URL/api/launchpad/staging/environment" | jq -c .

echo "== native auth enabled + runtime diagnostics =="
curl -sS "${HDR[@]}" "$BASE_URL/api/auth/native/enabled" | jq -c .
