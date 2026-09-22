# Reproducible Solana V2 gate artifact registry release

**Scope:** Reviewed, reproducible V2 ELF digest + server-owned registry entry for the observation adapter.  
**Independent review:** `bc-bd8ad079-d681-5a53-82da-80be75b24e9a`  
**Verdict:** CLOSED — 0 Critical / 0 High / 0 Medium  
**This document does not deploy, broadcast, configure RPCs, add keys, apply SQL, or move funds.**

## Release

- Artifact ID: `abraxas_eligibility_gate_v2_institutional_r1`
- Observation digest: `0x956eb9294aa866e8dbd76960841bdb17d3a58ccf801904038cea1169572f9787`
- ELF SHA-256: `0x4036d3ada9835db952b1a73f9f8b549f9a6a22ab5174554a9dd582ed249be1aa`
- Provenance: `solana/abraxas-eligibility-gate/release/v2-institutional.artifact.json`
- ELF binary and deploy keypairs are not committed

## Controls

| Area | Result |
|---|---|
| Artifact substitution | Mitigated — unknown / mutated ELF → `unrecognized_gate_artifact` |
| Source/build provenance | Safe fields only; no keys, RPC, account bytes, or txs |
| Digest normalization | Release keccak equals observation keccak after loader-header strip |
| Registry bypass | Browser / partner API / env JSON / Launchpad / manifest cannot write the registry |
| V1/V2 downgrade | V1 fixtures remain test-only; institutional still needs V2 + GateConfig flag |
| Unsafe commits | `.so` and `*-keypair.json` gitignored |
| Fixture fingerprints in runtime | `NODE_ENV=test` only; blocked on Vercel and production |

## Residual Low (not merge-blocking)

- L1: Observation trusts keccak; ELF SHA-256 is operator/release-script checked.
- L2: TypeScript and JSON provenance are now asserted equal in Vitest.
- L3: Fixture lookup still uses `NODE_ENV=test` plus Vercel/production denials.

## Commands

- `npx tsx scripts/solana-v2-gate-release-digest.ts`
- `npx vitest run lib/partner/onchainGateDeployments/solanaReleaseDigest.test.ts lib/partner/onchainGateDeployments/solanaObserve.test.ts lib/partner/onchainGateDeployments/onchainGateDeployments.test.ts lib/partner/onchainVerifierConformance/onchainVerifierConformance.test.ts`
- `rustup run 1.88.0 cargo test --manifest-path solana/abraxas-eligibility-gate/Cargo.toml --workspace`
- Homepage guard, homepage tests, trust-contract drift, CI-placeholder Next build
