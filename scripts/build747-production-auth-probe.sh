#!/usr/bin/env bash
# Build #747 — non-secret Production authentication readiness probe.
set -euo pipefail

BASE="${ABRAXAS_PRODUCTION_ORIGIN:-https://abraxasworld.xyz}"

echo "=== GET ${BASE}/api/auth/wallet/enabled ==="
curl -sS "${BASE}/api/auth/wallet/enabled" | jq '{
  auth_mode,
  flag_enabled,
  operational,
  config_code,
  solana_network,
  connect_mode,
  degraded_reason,
  persistence,
  ephemeral_security
}'

echo
echo "=== GET ${BASE}/api/auth/native/enabled ==="
curl -sS "${BASE}/api/auth/native/enabled" | jq '{
  auth_mode,
  enabled,
  operational,
  connect_mode,
  degraded_reason,
  ephemeral_security,
  solana_operational,
  persistence
}'
