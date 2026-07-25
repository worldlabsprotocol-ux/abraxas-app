#!/usr/bin/env bash
# FILE: scripts/sui/deploy-devnet.sh
# Build, publish Abraxas Passport to Sui devnet, bootstrap demo passport, write deployment JSON.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PKG="$ROOT/sui/abraxas_passport"
SUI="${SUI_BIN:-$ROOT/.sui-bin/sui}"
OUT="$ROOT/lib/sui/deployment.devnet.json"

if [[ ! -x "$SUI" ]]; then
  echo "Sui CLI not found at $SUI — install with: curl -fL https://github.com/MystenLabs/sui/releases/download/testnet-v1.74.0/sui-ubuntu-x86_64.tgz | tar xz -C $ROOT/.sui-bin --strip-components=1"
  exit 1
fi

echo "→ Building Move package…"
(cd "$PKG" && "$SUI" move build --build-env testnet)

echo "→ Publishing to devnet (test-publish / testnet build env)…"
PUBLISH_OUT="$(cd "$PKG" && "$SUI" client test-publish --build-env testnet --json)"
PACKAGE_ID="$(echo "$PUBLISH_OUT" | jq -r '.objectChanges[] | select(.type=="published") | .packageId')"
PUBLISH_TX="$(echo "$PUBLISH_OUT" | jq -r '.digest')"

if [[ -z "$PACKAGE_ID" || "$PACKAGE_ID" == "null" ]]; then
  echo "Failed to parse package ID from publish output"
  echo "$PUBLISH_OUT"
  exit 1
fi

echo "   Package: $PACKAGE_ID"
echo "   Tx:      $PUBLISH_TX"

echo "→ Bootstrapping demo passport…"
BOOTSTRAP_OUT="$("$SUI" client call \
  --package "$PACKAGE_ID" \
  --module passport \
  --function bootstrap_demo_passport \
  --args "@"$("$SUI" client active-address) \
  --json)"
BOOTSTRAP_TX="$(echo "$BOOTSTRAP_OUT" | jq -r '.digest')"

PASSPORT_ID="$(echo "$BOOTSTRAP_OUT" | jq -r '.objectChanges[] | select(.objectType | endswith("::passport::Passport")) | .objectId')"
CAP_ID="$(echo "$BOOTSTRAP_OUT" | jq -r '.objectChanges[] | select(.objectType | endswith("::passport::IssuanceCap")) | .objectId')"
OWNER="$("$SUI" client active-address)"

if [[ -z "$PASSPORT_ID" || "$PASSPORT_ID" == "null" ]]; then
  echo "Failed to parse passport object from bootstrap output"
  echo "$BOOTSTRAP_OUT"
  exit 1
fi

echo "   Passport: $PASSPORT_ID"
echo "   Cap:      $CAP_ID"
echo "   Owner:    $OWNER"

echo "→ Writing $OUT"
mkdir -p "$(dirname "$OUT")"
cat > "$OUT" <<EOF
{
  "network": "devnet",
  "rpcUrl": "https://fullnode.devnet.sui.io:443",
  "explorerBase": "https://suiscan.xyz/devnet",
  "packageId": "$PACKAGE_ID",
  "module": "passport",
  "publishedAt": "$(date -u +%Y-%m-%dT%H:%M:%S.000Z)",
  "publishTxDigest": "$PUBLISH_TX",
  "demoPassportObjectId": "$PASSPORT_ID",
  "demoIssuanceCapObjectId": "$CAP_ID",
  "demoOwnerAddress": "$OWNER",
  "demoBootstrapTxDigest": "$BOOTSTRAP_TX"
}
EOF

echo "✓ Sui devnet deployment complete"
