#!/usr/bin/env bash
# FILE: scripts/sui/mint-issuance-cap.sh
# Mint IssuanceCap for sponsor wallet on devnet or mainnet package.
#
# Usage:
#   npm run sui:mint-cap              # devnet (default)
#   npm run sui:mint-cap -- mainnet   # after deploy-mainnet.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SUI="${SUI_BIN:-$ROOT/.sui-bin/sui}"
NETWORK="${1:-devnet}"

case "$NETWORK" in
  devnet)
    DEPLOY="$ROOT/lib/sui/deployment.devnet.json"
    ;;
  mainnet)
    DEPLOY="$ROOT/lib/sui/deployment.mainnet.json"
    ;;
  *)
    echo "Usage: $0 [devnet|mainnet]"
    exit 1
    ;;
esac

if [[ ! -x "$SUI" ]]; then
  echo "Sui CLI not found at $SUI"
  exit 1
fi

PACKAGE_ID="$(jq -r '.packageId' "$DEPLOY")"
if [[ -z "$PACKAGE_ID" || "$PACKAGE_ID" == "null" || "$PACKAGE_ID" == "" ]]; then
  echo "No packageId in $DEPLOY — deploy first (npm run sui:deploy:$NETWORK)"
  exit 1
fi

ACTIVE="$("$SUI" client active-address)"

echo "→ Network:  $NETWORK"
echo "→ Package:  $PACKAGE_ID"
echo "→ Wallet:   $ACTIVE"
echo ""
echo "→ Calling passport::mint_cap…"

OUT="$("$SUI" client call \
  --package "$PACKAGE_ID" \
  --module passport \
  --function mint_cap \
  --gas-budget 20000000 \
  --json)"

CAP_ID="$(echo "$OUT" | jq -r '.objectChanges[] | select(.objectType | endswith("::passport::IssuanceCap")) | .objectId')"
TX="$(echo "$OUT" | jq -r '.digest')"

if [[ -z "$CAP_ID" || "$CAP_ID" == "null" ]]; then
  echo "Failed to parse IssuanceCap:"
  echo "$OUT" | jq .
  exit 1
fi

if [[ "$NETWORK" == "mainnet" ]]; then
  TMP="$(mktemp)"
  jq --arg cap "$CAP_ID" '.demoIssuanceCapObjectId = $cap' "$DEPLOY" > "$TMP" && mv "$TMP" "$DEPLOY"
  echo "   Updated demoIssuanceCapObjectId in deployment.mainnet.json"
fi

echo ""
echo "✓ IssuanceCap minted on $NETWORK"
echo ""
echo "  Cap ID:  $CAP_ID"
echo "  Tx:      $TX"
echo ""
echo "Vercel:"
echo "  SUI_ISSUANCE_CAP_OBJECT_ID=$CAP_ID"
echo "  SUI_SPONSOR_SECRET_KEY=suiprivkey1…  (sui keytool export --key-identity $ACTIVE)"
