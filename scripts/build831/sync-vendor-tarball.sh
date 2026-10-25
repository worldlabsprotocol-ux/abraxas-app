#!/usr/bin/env bash
# Copy canonical verifier tarball into external-node-partner/vendor (self-contained example).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SRC="$ROOT/artifacts/npm/abraxas-independent-verifier-0.1.1.tgz"
DST="$ROOT/examples/external-node-partner/vendor"
mkdir -p "$DST"
cp "$SRC" "$DST/"
cp "$SRC.sha256" "$DST/"
echo "Synced to $DST"
