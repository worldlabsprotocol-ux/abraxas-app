# Reproducible Solana V2 gate artifact registry release

**Scope:** Reviewed, reproducible V2 ELF digest + server-owned registry entry for the observation adapter.  
**Independent review:** pending  
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
| Artifact substitution | Fail-closed — unknown / mutated ELF → `unrecognized_gate_artifact` |
| Source/build provenance | Safe fields only; no keys, RPC, account bytes, or txs |
| Digest normalization | Release keccak equals observation keccak after loader-header strip |
| Registry bypass | Browser / partner API / env JSON / Launchpad / manifest cannot write the registry |
| V1/V2 downgrade | V1 fixtures remain test-only; institutional still needs V2 + GateConfig flag |
| Unsafe commits | `.so` and `*-keypair.json` gitignored |
| Fixture fingerprints in runtime | `NODE_ENV=test` only; blocked on Vercel and production |

## Residual

Independent review findings will be recorded here. Zero Critical / High / Medium is required before a human Solana devnet deploy.
