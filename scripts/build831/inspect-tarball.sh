#!/usr/bin/env bash
# Inspect verifier pack for secrets and internal paths (Build #831 release gate).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
TGZ="${1:-$ROOT/artifacts/npm/abraxas-independent-verifier-0.1.1.tgz}"

if [[ ! -f "$TGZ" ]]; then
  echo "Missing tarball: $TGZ" >&2
  exit 1
fi

echo "=== Tarball listing ==="
tar -tzf "$TGZ"

echo "=== Forbidden content scan ==="
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
tar -xzf "$TGZ" -C "$WORK"
PKG="$(find "$WORK" -name package -type d | head -1)"
if rg '@/lib|supabase|postgrest|ABRAXAS_SIGNING_KEY|service_role' "$PKG" >/dev/null 2>&1; then
  echo "FAIL: suspicious strings in package" >&2
  rg '@/lib|supabase|postgrest|ABRAXAS_SIGNING_KEY|service_role' "$PKG" || true
  exit 1
fi

echo "=== Entry points ==="
node -e "
const fs=require('fs');
const p=JSON.parse(fs.readFileSync('$PKG/package.json','utf8'));
console.log('main', p.main, 'module', p.module, 'exports', JSON.stringify(p.exports));
"

echo "OK: tarball inspection passed"
