#!/usr/bin/env bash
# BUILD #959 — Pre-activation checks for abraxas-np-institutional-1 (Option A).
# Read-only. Does not provision resources or print secret values.
set -euo pipefail

HOSTNAME="${ABRAXAS_NP_INGRESS_HOST:-np-institutional.abraxasworld.xyz}"
REGION="${ABRAXAS_AWS_REGION:-us-east-1}"
CEILING_USD="${ABRAXAS_NP_SPEND_CEILING:-50}"
SOFTWARE_PIN="${ABRAXAS_NP_SOFTWARE_PIN:-d10bf66f}"

echo "=== BUILD #959 preflight: abraxas-np-institutional-1 ==="
echo "software_pin=${SOFTWARE_PIN} region=${REGION} hostname=${HOSTNAME} ceiling_usd=${CEILING_USD}"
echo

FAIL=0

if command -v aws >/dev/null 2>&1; then
  if aws sts get-caller-identity --region "$REGION" >/dev/null 2>&1; then
    echo "[ok] AWS caller identity available"
    aws sts get-caller-identity --output json --region "$REGION" | sed 's/Arn/Arn/' 
  else
    echo "[fail] AWS CLI present but credentials invalid or missing"
    FAIL=1
  fi
else
  echo "[fail] aws CLI not installed"
  FAIL=1
fi

if command -v dig >/dev/null 2>&1; then
  echo
  echo "DNS A/AAAA for ${HOSTNAME}:"
  dig +short A "$HOSTNAME" || true
  dig +short AAAA "$HOSTNAME" || true
  if curl -sSI "https://${HOSTNAME}" 2>/dev/null | head -5 | grep -qi vercel; then
    echo "[warn] HTTPS responds via Vercel — repoint DNS to EC2 Elastic IP before worker ingress"
  fi
else
  echo "[warn] dig not available"
fi

echo
echo "Expected worker bind: 127.0.0.1:3848 (public 3848 must be closed)"
echo "Demo DB: OUT | Production: OUT"
echo "Itemized Option A estimate: see docs/operations/BUILD_959_PHASE2_PREFLIGHT_RESULT.md"

if [ "$FAIL" -ne 0 ]; then
  echo
  echo "=== PREFLIGHT: NO-GO (fix AWS access before provisioning) ==="
  exit 1
fi

echo
echo "=== PREFLIGHT: AWS identity OK — operator may proceed to provisioning runbook ==="
exit 0
