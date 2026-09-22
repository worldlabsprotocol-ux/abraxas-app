# Reproducible Solana V2 eligibility-gate release

Secret-free. This file does not deploy, broadcast, configure RPC, or record keys.

## Reviewed artifact

- Artifact ID: `abraxas_eligibility_gate_v2_institutional_r1`
- Program ID: `GmaDrppBC7P5ARKV8g3djiwP89vz1jLK23V2GBjuAEGB`
- Program crate: `abraxas-eligibility-gate` `0.1.0`
- Source commit: `0480d9ac4c739a99a6f3d5773da351a19a1d0f79`
- Observation digest (keccak of ELF after loader-header strip): `0x956eb9294aa866e8dbd76960841bdb17d3a58ccf801904038cea1169572f9787`
- ELF SHA-256: `0x4036d3ada9835db952b1a73f9f8b549f9a6a22ab5174554a9dd582ed249be1aa`
- Canonical message: V2 / 468 bytes
- Institutional `GateConfig.require_institutional` supported
- Status: approved

This approved artifact is historical and bound to the program ID above. It **does not** approve the new devnet candidate program ID `4hf3cY57ciPakr4omyTSbksAfW672iGrdo6fiDVQAD4K`. A new source-controlled digest review is required before that candidate can pass server verification or registration. There is no deploy button or automatic deployment path.

## Pinned toolchain

| Component | Version | Source |
|---|---|---|
| Host Rust | 1.88.0 | `rust-toolchain.toml` |
| Anchor | 0.30.1 | `Anchor.toml` / crate |
| Solana ProgramTest | 1.18.26 | workspace `Cargo.toml` |
| cargo-build-sbf | 2.2.20 | documented Solana CLI family |
| SBF platform-tools | v1.53 (rustc 1.89.0) | required to compile Cargo.lock v4 + edition2024 transitive crates |

## Build the new program-ID candidate

Run from the repository root in Ubuntu, with the pinned toolchain installed:

```bash
cd solana/abraxas-eligibility-gate
PATH="$HOME/.cache/solana/v1.53/platform-tools/rust/bin:$PATH" \
  cargo-build-sbf --tools-version v1.53 --no-rustup-override \
  --manifest-path programs/abraxas-eligibility-gate/Cargo.toml
cd ../..
npx tsx scripts/solana-v2-gate-release-digest.ts --candidate
```

The candidate command prints only the public program ID and ELF hashes. `release_status: candidate_unreviewed` and `matches_registry: false` are expected. Stop here and have the new digest and program binding reviewed into the source-controlled artifact registry before any devnet deployment, `verify`, or `register`. Do not run the default approved-release check against this candidate; it must fail until a new release is approved.

Do not commit `target/`, `.so` files, or generated `*-keypair.json`.
