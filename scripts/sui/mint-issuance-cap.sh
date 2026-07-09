#!/usr/bin/env bash
# FILE: scripts/sui/mint-issuance-cap.sh
# Mint a NEW IssuanceCap for YOUR wallet on the already-deployed Abraxas Passport package.
# Use when you don't have the original deploy wallet's private key.
#
# Prerequisites:
#   1. Sui CLI installed (see scripts/sui/deploy-devnet.sh)
#   2. Your wallet imported and set active:
#        sui keytool import "your twelve word seed phrase here" ed25519
#        sui client switch --address 0xYOUR_ADDRESS
#   3. Devnet SUI for gas: sui client faucet
#
# After running, copy the new Cap object ID into Vercel:
#   SUI_ISSUANCE_CAP_OBJECT_ID=0x...
# And export your active wallet key:
#   sui keytool export --key-identity 0xYOUR_ADDRESS

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SUI="${SUI_BIN:-$ROOT/.sui-bin/sui}"
DEPLOY="$ROOT/lib/sui/deployment.devnet.json"

if [[ ! -x "$SUI" ]]; then
  echo "Sui CLI not found at $SUI"
  exit 1
fi

PACKAGE_ID="$(jq -r '.packageId' "$DEPLOY")"
ACTIVE="$("$SUI" client active-address)"

echo "→ Package:  $PACKAGE_ID"
echo "→ Active wallet (will receive new IssuanceCap): $ACTIVE"
echo ""
echo "→ Calling passport::mint_cap on devnet…"

OUT="$("$SUI" client call \
  --package "$PACKAGE_ID" \
  --module passport \
  --function mint_cap \
  --gas-budget 20000000 \
  --json)"

CAP_ID="$(echo "$OUT" | jq -r '.objectChanges[] | select(.objectType | endswith("::passport::IssuanceCap")) | .objectId')"
TX="$(echo "$OUT" | jq -r '.digest')"

if [[ -z "$CAP_ID" || "$CAP_ID" == "null" ]]; then
  echo "Failed to parse IssuanceCap from transaction output:"
  echo "$OUT" | jq .
  exit 1
fi

echo ""
echo "✓ IssuanceCap minted"
echo ""
echo "  Wallet:     $ACTIVE"
echo "  Cap ID:     $CAP_ID"
echo "  Tx:         $TX"
echo ""
echo "Add to Vercel environment variables:"
echo ""
echo "  SUI_ISSUANCE_CAP_OBJECT_ID=$CAP_ID"
echo ""
echo "Export your sponsor private key (do NOT share this):"
echo ""
echo "  sui keytool export --key-identity $ACTIVE"
echo ""
echo "Paste the suiprivkey1… output as:"
echo ""
echo "  SUI_SPONSOR_SECRET_KEY=suiprivkey1…"
echo ""
echo "Fund wallet if needed: sui client faucet"
echo "Then redeploy Vercel."
