# Reproducible Solana V2 eligibility-gate release

Secret-free. This file does not deploy, broadcast, configure RPC, or record keys.

## Reviewed artifact

- Artifact ID: `abraxas_eligibility_gate_v2_institutional_r1`
- Program crate: `abraxas-eligibility-gate` `0.1.0`
- Source commit: `0480d9ac4c739a99a6f3d5773da351a19a1d0f79`
- Observation digest (keccak of ELF after loader-header strip): `0x956eb9294aa866e8dbd76960841bdb17d3a58ccf801904038cea1169572f9787`
- ELF SHA-256: `0x4036d3ada9835db952b1a73f9f8b549f9a6a22ab5174554a9dd582ed249be1aa`
- Canonical message: V2 / 468 bytes
- Institutional `GateConfig.require_institutional` supported
- Status: approved

The operator must rebuild the ELF locally and confirm both digests match this release **before** `verify` or `register`. There is no deploy button and no automatic deployment path.

## Pinned toolchain

| Component | Version | Source |
|---|---|---|
| Host Rust | 1.88.0 | `rust-toolchain.toml` |
| Anchor | 0.30.1 | `Anchor.toml` / crate |
| Solana ProgramTest | 1.18.26 | workspace `Cargo.toml` |
| cargo-build-sbf | 2.2.20 | documented Solana CLI family |
| SBF platform-tools | v1.53 (rustc 1.89.0) | required to compile Cargo.lock v4 + edition2024 transitive crates |

## Build

```
cd solana/abraxas-eligibility-gate
PATH="$HOME/.cache/solana/v1.53/platform-tools/rust/bin:$PATH" \
  cargo-build-sbf --tools-version v1.53 --no-rustup-override \
  --manifest-path programs/abraxas-eligibility-gate/Cargo.toml
npx tsx scripts/solana-v2-gate-release-digest.ts
```

Do not commit `target/`, `.so` files, or generated `*-keypair.json`.
