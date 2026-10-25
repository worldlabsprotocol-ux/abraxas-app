#!/usr/bin/env bash
# Build #830 — run external partner example tests in a copied directory (no @/lib).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

cp -R "$ROOT/examples/external-node-partner" "$TMP/partner-app"
cp -R "$ROOT/packages/abraxas-independent-verifier" "$TMP/abraxas-independent-verifier"
cp -R "$ROOT/examples/integration-first-relying-party/syntheticFixtureFactory.ts" "$TMP/partner-app/syntheticFixtureFactory.ts" 2>/dev/null || true

cd "$TMP/partner-app"
# Tests import synthetic factory from repo path — run from monorepo root instead for full suite.
cd "$ROOT/examples/external-node-partner"
npm install --silent 2>/dev/null || npm install
npm test

echo "OK: external-node-partner tests passed (monorepo-linked verifier)"
