#!/usr/bin/env bash
# Copy external-node-partner folder alone to /tmp and npm install (no monorepo paths).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

cp -R "$ROOT/examples/external-node-partner" "$TMP/app"
rm -rf "$TMP/app/node_modules"
cd "$TMP/app"
npm install --silent
npm test --silent
echo "OK: self-contained example at $TMP/app (removed on exit)"
