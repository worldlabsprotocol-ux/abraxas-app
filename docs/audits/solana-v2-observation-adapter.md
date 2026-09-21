# Server-verified Solana V2 gate observation adapter

**Scope:** Replace raw keccak/V1-only `serverSolanaRpcAdapter` with structured, server-only observation.  
**Independent review:** `bc-b8994a02-fb14-5339-8431-721c6fdedf96`  
**Verdict:** CLOSED — 0 Critical / 0 High / 0 Medium  
**This document does not deploy, broadcast, configure RPCs, add keys, apply SQL, or move funds.**

## Architecture

1. Server RPC fetches upgradeable program + ProgramData + GateConfig accounts.
2. Program digest is keccak of ProgramData ELF after the upgradeable-loader header.
3. Digest must match a source-controlled artifact in `solanaArtifacts.ts`.
4. GateConfig PDA is re-derived from observed `admin` and `[gate_config, admin]`.
5. Bindings, signer key-id class, and `require_institutional` come from decoded GateConfig, never from the client.
6. Safe observation fields only: schema/length/capability classes and typed reasons.

## Threat review

| Area | Result |
|---|---|
| Client observation forgery | Mitigated — Launchpad cannot pass adapters or observation fields |
| Upgradeable-loader confusion | Mitigated — loader owner + discriminant 2/3 + ELF tail |
| ProgramData / program mismatch | Mitigated — digest from linked ProgramData ELF |
| GateConfig PDA substitution | Mitigated — re-derived PDA must match manifest |
| Artifact-registry bypass | Mitigated — unknown digest → `unrecognized_gate_artifact` |
| V1/V2 downgrade | Mitigated — institutional needs V2 artifact + on-chain flag |
| Signer confusion | Mitigated — revoked slot → `signer_update_required` |
| Unsafe error leakage | Mitigated — typed reasons; catch → `invalid` |
| Fixture activation outside test | Mitigated — blocked on Vercel and production |

## Residual Low (not merge-blocking)

- L1: Internal `solanaAdapter` override is not on the Launchpad HTTP path.
- L2: `partner_program` is not cross-checked; authorize still fails on-chain.
- L3: Observation binds signer `key_id`, not pubkey.
- L4: Registry currently holds fixture ELF fingerprints. Real programs fail closed as `unrecognized_gate_artifact` until those fingerprints are added.

## Commands

- `npx vitest run lib/partner/onchainGateDeployments/solanaObserve.test.ts lib/partner/onchainGateDeployments/onchainGateDeployments.test.ts`
- `rustup run 1.88.0 cargo test --manifest-path solana/abraxas-eligibility-gate/Cargo.toml --workspace`
- Homepage guard, homepage tests, trust-contract drift, CI-placeholder Next build
