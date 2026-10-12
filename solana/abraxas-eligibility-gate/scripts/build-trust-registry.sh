#!/usr/bin/env bash
# Reproducible trust-registry build (Build #534). Secret-free.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if command -v rustup >/dev/null 2>&1; then
  rustup toolchain install 1.88.0 -c rustfmt 2>/dev/null || true
  rustup default 1.88.0 2>/dev/null || true
fi

export RUSTFLAGS="${RUSTFLAGS:-}"
cargo fmt -p abraxas-trust-registry --check
cargo test -p abraxas-trust-registry -- --nocapture
cargo test -p abraxas-eligibility-gate-integration-tests --test trust_registry -- --nocapture
cargo test -p abraxas-eligibility-gate-integration-tests --test trust_registry_governance_transfer -- --nocapture
cargo test -p abraxas-eligibility-gate-integration-tests --test trust_registry_legacy_compat -- --nocapture

if command -v cargo-build-sbf >/dev/null 2>&1; then
  PATH="${HOME}/.cache/solana/v1.53/platform-tools/rust/bin:${PATH}" \
    cargo-build-sbf --tools-version v1.53 --no-rustup-override \
    --manifest-path programs/abraxas-trust-registry/Cargo.toml
elif command -v anchor >/dev/null 2>&1; then
  anchor build -p abraxas_trust_registry
else
  echo "BLOCKED: install Solana cargo-build-sbf or Anchor CLI to produce .so artifact" >&2
  exit 2
fi

SO="target/deploy/abraxas_trust_registry.so"
IDL="target/idl/abraxas_trust_registry.json"
test -f "$SO" || { echo "missing $SO" >&2; exit 1; }
sha256sum "$SO"
test -f "$IDL" || echo "WARN: IDL missing (anchor idl build may be required)"
