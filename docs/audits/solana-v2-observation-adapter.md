# Server-verified Solana V2 gate observation adapter

**Scope:** Replace raw keccak/V1-only `serverSolanaRpcAdapter` with structured, server-only observation.  
**This document does not deploy, broadcast, configure RPCs, add keys, apply SQL, or move funds.**

## Architecture

1. Server RPC fetches upgradeable program + ProgramData + GateConfig accounts.
2. Program digest is keccak of ProgramData ELF after the upgradeable-loader header.
3. Digest must match a source-controlled artifact in `solanaArtifacts.ts`.
4. GateConfig PDA is re-derived from observed `admin` and `[gate_config, admin]`.
5. Bindings, signer key-id class, and `require_institutional` come from decoded GateConfig, never from the client.
6. Safe observation fields only: schema/length/capability classes and typed reasons.

## Commands

See the PR body for the exact Vitest, ProgramTest, homepage, trust-contract, and Next build commands.

## Findings

Filled after the independent audit agent review.
