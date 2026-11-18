#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT/solana/abraxas-eligibility-gate"
echo "=== BUILD #981 partner acceptance ==="
SECONDS=0
cargo test -p abraxas-eligibility-gate-integration-tests --test partner_acceptance -- --nocapture
echo "partner_acceptance elapsed ${SECONDS}s"
SECONDS=0
cargo test -p abraxas-eligibility-gate-integration-tests --test tokenization_entitlement
echo "tokenization_entitlement elapsed ${SECONDS}s"
cargo run --bin partner-verify authorized
cargo run --bin partner-verify revoked
echo "PASS"