#!/usr/bin/env bash
# Build and pack @abraxas/partner-kit for external tarball distribution.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/dist/partner-kit-release"
PKG="@abraxas/partner-kit"

cd "$ROOT"
npm run partner-kit:build
mkdir -p "$OUT"

PACKED="$(npm pack --pack-destination "$OUT" -w "$PKG" 2>&1 | tail -1)"
TGZ="$OUT/$PACKED"

if [[ ! -f "$TGZ" ]]; then
  echo "pack failed: expected $TGZ" >&2
  exit 1
fi

sha256sum "$TGZ" | tee "$TGZ.sha256"
echo "PartnerKit release artifact: $TGZ"
