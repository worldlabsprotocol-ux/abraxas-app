#!/usr/bin/env bash
# FILE: scripts/sui/deploy-mainnet.sh
# Publish Abraxas Passport to Sui mainnet — gate #3 (after audit gate #2).
#
# Prerequisites:
#   1. Sui Passport Move audit complete (gate #2)
#   2. Sui CLI on mainnet: sui client switch --env mainnet
#   3. Sponsor wallet funded with mainnet SUI for gas
#   4. CONFIRM_MAINNET=1
#
# After publish:
#   npm run sui:mint-cap -- mainnet
#   Set Vercel: SUI_NETWORK=mainnet, SUI_SPONSOR_SECRET_KEY, SUI_ISSUANCE_CAP_OBJECT_ID

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PKG="$ROOT/sui/abraxas_passport"
SUI="${SUI_BIN:-$ROOT/.sui-bin/sui}"
OUT="$ROOT/lib/sui/deployment.mainnet.json"

if [[ "${CONFIRM_MAINNET:-}" != "1" ]]; then
  echo "❌ Mainnet publish blocked."
  echo "   Complete gate #2 (Sui Passport audit) first."
  echo "   Then run: CONFIRM_MAINNET=1 npm run sui:deploy:mainnet"
  exit 1
fi

if [[ ! -x "$SUI" ]]; then
  echo "Sui CLI not found at $SUI"
  exit 1
fi

ACTIVE_ENV="$("$SUI" client active-env 2>/dev/null || true)"
if [[ "$ACTIVE_ENV" != *mainnet* ]]; then
  echo "❌ Active Sui env is '$ACTIVE_ENV' — switch to mainnet:"
  echo "   sui client switch --env mainnet"
  exit 1
fi

PUBLISHER="$("$SUI" client active-address)"
echo "→ Building Move package…"
(cd "$PKG" && "$SUI" move build)

echo "→ Publishing to Sui MAINNET (real gas)…"
echo "   Publisher: $PUBLISHER"
PUBLISH_OUT="$(cd "$PKG" && "$SUI" client publish --gas-budget 500000000 --json)"
PACKAGE_ID="$(echo "$PUBLISH_OUT" | jq -r '.objectChanges[] | select(.type=="published") | .packageId')"
PUBLISH_TX="$(echo "$PUBLISH_OUT" | jq -r '.digest')"

if [[ -z "$PACKAGE_ID" || "$PACKAGE_ID" == "null" ]]; then
  echo "Failed to parse package ID"
  echo "$PUBLISH_OUT" | jq .
  exit 1
fi

echo "   Package: $PACKAGE_ID"
echo "   Tx:      $PUBLISH_TX"

echo "→ Writing $OUT"
mkdir -p "$(dirname "$OUT")"
cat > "$OUT" <<EOF
{
  "network": "mainnet",
  "rpcUrl": "https://fullnode.mainnet.sui.io:443",
  "explorerBase": "https://suiscan.xyz/mainnet",
  "packageId": "$PACKAGE_ID",
  "module": "passport",
  "publishedAt": "$(date -u +%Y-%m-%dT%H:%M:%S.000Z)",
  "publishTxDigest": "$PUBLISH_TX",
  "demoPassportObjectId": "",
  "demoIssuanceCapObjectId": "",
  "demoOwnerAddress": "$PUBLISHER",
  "_readme": "Mint IssuanceCap: npm run sui:mint-cap -- mainnet. Then set Vercel env and redeploy."
}
EOF

echo ""
echo "✓ Sui MAINNET package published"
echo ""
echo "Next:"
echo "  1. npm run sui:mint-cap -- mainnet"
echo "  2. Commit lib/sui/deployment.mainnet.json"
echo "  3. Vercel env: SUI_NETWORK=mainnet, SUI_SPONSOR_SECRET_KEY, SUI_ISSUANCE_CAP_OBJECT_ID"
echo "  4. Redeploy → GET /api/sui/mainnet/readiness"
