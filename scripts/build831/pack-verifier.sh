#!/usr/bin/env bash
# Build #831 — reproducible verifier tarball + SHA-256 checksum.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PKG="$ROOT/packages/abraxas-independent-verifier"
OUT="$ROOT/artifacts/npm"
mkdir -p "$OUT"

cd "$PKG"
npm ci --silent 2>/dev/null || npm install --silent
npm run build
npm pack --pack-destination "$OUT"

Tgz=$(ls -1 "$OUT"/abraxas-independent-verifier-*.tgz | sort -V | tail -1)
(
  cd "$OUT"
  shasum -a 256 "$(basename "$Tgz")" > "$(basename "$Tgz").sha256"
)

bash "$ROOT/scripts/build831/sync-vendor-tarball.sh"

echo "Packed: $Tgz"
cat "$Tgz.sha256"
