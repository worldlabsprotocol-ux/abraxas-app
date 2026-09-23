# Reproducible Solana V2 eligibility-gate release

Secret-free. This file does not deploy, broadcast, configure RPC, or record keys.

## Current reviewed artifact

- Artifact ID: `abraxas_eligibility_gate_v2_institutional_r2`
- Program ID: `4hf3cY57ciPakr4omyTSbksAfW672iGrdo6fiDVQAD4K`
- Source commit: `cebf7b788bebf2609b40a8fbfe94ead8f50aec07`
- Observation digest: `0x6adcb3850f269710bd815bde0cc518cf6d02e167a01398776d8d78df9f566991`
- ELF SHA-256: `0x37f7310ee6ceab81619964165a8d570a1af3502bf52bc8bf52e46d6d1515cdd8`
- Reproduction: operator Ubuntu build and independent GitHub CI run `35810088694` matched both hashes and the 278184-byte size.
- Provenance: `release/v2-institutional-r2.artifact.json`
- Status: approved artifact, `live: false`. This does not mean a program is deployed or a gate is registered.

## Historical reviewed artifact

- Artifact ID: `abraxas_eligibility_gate_v2_institutional_r1`
- Program ID: `GmaDrppBC7P5ARKV8g3djiwP89vz1jLK23V2GBjuAEGB`
- Program crate: `abraxas-eligibility-gate` `0.1.0`
- Source commit: `0480d9ac4c739a99a6f3d5773da351a19a1d0f79`
- Observation digest (keccak of ELF after loader-header strip): `0x956eb9294aa866e8dbd76960841bdb17d3a58ccf801904038cea1169572f9787`
- ELF SHA-256: `0x4036d3ada9835db952b1a73f9f8b549f9a6a22ab5174554a9dd582ed249be1aa`
- Canonical message: V2 / 468 bytes
- Institutional `GateConfig.require_institutional` supported
- Status: approved

The r1 digest remains bound to the r1 program ID above. It cannot be used to verify or register the r2 program ID. There is no deploy button or automatic deployment path.

## Pinned toolchain

| Component | Version | Source |
|---|---|---|
| Host Rust | 1.88.0 | `rust-toolchain.toml` |
| Anchor | 0.30.1 | `Anchor.toml` / crate |
| Solana ProgramTest | 1.18.26 | workspace `Cargo.toml` |
| cargo-build-sbf | 2.2.20 | documented Solana CLI family |
| SBF platform-tools | v1.53 (rustc 1.89.0) | required to compile Cargo.lock v4 + edition2024 transitive crates |

## Rebuild the current program ID

Run from the repository root in Ubuntu, with the pinned toolchain installed:

```bash
cd solana/abraxas-eligibility-gate
PATH="$HOME/.cache/solana/v1.53/platform-tools/rust/bin:$PATH" \
  cargo-build-sbf --tools-version v1.53 --no-rustup-override \
  --manifest-path programs/abraxas-eligibility-gate/Cargo.toml
cd ../..
npx tsx scripts/solana-v2-gate-release-digest.ts
```

The digest check must report `matches_registry: true` for the exact r2 program ID and hashes. The pre-approval candidate record remains in `release/v2-institutional-r2.candidate.json` as provenance. Artifact approval only removes the fingerprint blocker; the separate human deployment, GateConfig initialization, chain observation, and registration checks still apply.

Do not commit `target/`, `.so` files, or generated `*-keypair.json`.
