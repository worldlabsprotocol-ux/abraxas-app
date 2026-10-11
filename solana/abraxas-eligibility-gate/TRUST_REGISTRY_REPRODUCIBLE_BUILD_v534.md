# Trust Registry Reproducible Build (Build #534)

## Pinned toolchain

| Component | Version |
|-----------|---------|
| Rust | 1.88.0 (`rust-toolchain.toml`) |
| Anchor | 0.30.1 |
| Solana CLI / cargo-build-sbf | 2.2.20 |
| SBF platform-tools | v1.53 |

## Build commands

```bash
cd solana/abraxas-eligibility-gate
rustup toolchain install 1.88.0 -c rustfmt
rustup override set 1.88.0
curl -sSfL https://release.anza.xyz/v2.2.20/install | sh
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"

cargo test -p abraxas-trust-registry
cargo test -p abraxas-eligibility-gate-integration-tests --test trust_registry

PATH="$HOME/.cache/solana/v1.53/platform-tools/rust/bin:$PATH" \
  cargo-build-sbf --tools-version v1.53 --no-rustup-override \
  --manifest-path programs/abraxas-trust-registry/Cargo.toml

sha256sum target/deploy/abraxas_trust_registry.so
```

## Program ID

- **Build-bound ID:** `EN29YNgHRuJ3h9cWrPS9hSDBt8DUNtoSSTT9EbUZewC8`
- Must match `declare_id!`, `Anchor.toml`, and TypeScript `ABRAXAS_TRUST_REGISTRY_PROGRAM_ID`.
- **Never commit** `target/deploy/*-keypair.json` (see workspace `.gitignore`).

## IDL

Generate with Anchor CLI after install:

```bash
anchor build -p abraxas_trust_registry
# output: target/idl/abraxas_trust_registry.json
```

## Rent / compute (estimates)

- `TrustRegistry` ~600 bytes + 3×2 authority slots
- `PolicyRecord` ~120 bytes
- `CommitmentState` ~180 bytes
- Instructions are account updates only (no CPI); typical CU well below default tx budget
