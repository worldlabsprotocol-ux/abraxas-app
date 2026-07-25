#!/usr/bin/env bash
# One-shot devnet sponsor setup for Cursor cloud / CI.
# Requires SUI_SPONSOR_SECRET_KEY in environment (never paste in chat).
#
# Usage:
#   export SUI_SPONSOR_SECRET_KEY='suiprivkey1…'
#   npm run sui:setup-devnet
#
# Prints SUI_ISSUANCE_CAP_OBJECT_ID + sponsor address for Vercel.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SUI="${SUI_BIN:-$ROOT/.sui-bin/sui}"

if [[ ! -x "$SUI" ]]; then
  echo "→ Installing Sui CLI…"
  bash "$ROOT/scripts/sui/install-cli.sh"
fi

if [[ -z "${SUI_SPONSOR_SECRET_KEY:-}" ]]; then
  echo "❌ SUI_SPONSOR_SECRET_KEY is not set."
  echo ""
  echo "Add it to Cursor Cloud Environment secrets (not chat), then re-run:"
  echo "  npm run sui:setup-devnet"
  exit 1
fi

KEY="${SUI_SPONSOR_SECRET_KEY//[[:space:]]/}"
if [[ ! "$KEY" =~ ^suiprivkey1 ]]; then
  echo "❌ SUI_SPONSOR_SECRET_KEY must start with suiprivkey1"
  exit 1
fi

export SUI_CONFIG_DIR="${SUI_CONFIG_DIR:-$ROOT/.sui-config}"
mkdir -p "$SUI_CONFIG_DIR"

echo "→ Switching Sui client to devnet…"
"$SUI" client switch --env devnet 2>/dev/null || true

# Import sponsor key into ephemeral project keystore (not committed).
ADDR="$("$SUI" keytool import "$KEY" ed25519 2>/dev/null | grep -oE '0x[a-fA-F0-9]{64}' | head -1 || true)"
if [[ -z "$ADDR" ]]; then
  ADDR="$("$SUI" client active-address 2>/dev/null || true)"
fi
if [[ -z "$ADDR" ]]; then
  echo "❌ Could not derive sponsor address from key."
  exit 1
fi

"$SUI" client switch --address "$ADDR" 2>/dev/null || true

echo "→ Sponsor address: $ADDR"
echo "→ Requesting devnet gas (faucet)…"
if ! "$SUI" client faucet 2>/dev/null; then
  echo "⚠ Faucet CLI failed — fund manually at https://faucet.sui.io (Devnet) for $ADDR"
  echo "  Then re-run: npm run sui:setup-devnet"
fi

echo "→ Minting IssuanceCap on devnet package…"
CAP_OUT="$(bash "$ROOT/scripts/sui/mint-issuance-cap.sh" devnet)"
CAP_ID="$(echo "$CAP_OUT" | grep -oE 'Cap ID:\s+0x[a-fA-F0-9]{64}' | awk '{print $3}')"
if [[ -z "$CAP_ID" ]]; then
  CAP_ID="$(echo "$CAP_OUT" | grep -oE 'SUI_ISSUANCE_CAP_OBJECT_ID=0x[a-fA-F0-9]{64}' | cut -d= -f2)"
fi

if [[ -z "$CAP_ID" ]]; then
  echo "❌ Mint failed. Output:"
  echo "$CAP_OUT"
  exit 1
fi

LEN="${#CAP_ID}"
if [[ "$LEN" -ne 66 ]]; then
  echo "❌ Cap ID length $LEN — expected 66 (0x + 64 hex)"
  exit 1
fi

echo ""
echo "════════════════════════════════════════════════════════"
echo "  VERCEL → Settings → Environment Variables → Production"
echo "════════════════════════════════════════════════════════"
echo ""
echo "SUI_NETWORK=devnet"
echo "NEXT_PUBLIC_SUI_NETWORK=devnet"
echo "SUI_ISSUANCE_CAP_OBJECT_ID=$CAP_ID"
echo "SUI_SPONSOR_SECRET_KEY=(same suiprivkey1 value already in Cursor secrets)"
echo ""
echo "DELETE if present:"
echo "  SUI_ISSUER_SECRET_KEY"
echo "  any truncated SUI_ISSUANCE_CAP_OBJECT_ID"
echo ""
echo "Then: Deployments → Redeploy"
echo ""
echo "Verify: https://abraxas-app.vercel.app/api/sui/passport/sponsor"
echo "  want: configured=true, cap_owner_matches_sponsor=true"
echo "════════════════════════════════════════════════════════"
