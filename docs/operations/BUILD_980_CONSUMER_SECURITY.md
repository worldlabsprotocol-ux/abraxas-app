# BUILD #980 — Independent entitlement consumer security

Local/sandbox only. Extends BUILD #979; no duplicate verifier or protocol.

## Trust boundary strengthened

A relying party stores **durable trusted configuration** (`TrustedRelyingPartyConfig` PDA, seeds `relying_party_config` + admin). Only that admin may init/update (monotonic `config_version`). `consume_verified_entitlement` accepts only `receipt_id_hash` in instruction data — partner, policy, application, and proof registry admin come from **stored config**, not the transaction caller.

Cross-program PDAs (registry, commitment, mint config, issuance ledger) validate with `seeds::program = abraxas_proof_continuity::ID` so substituted accounts from another program cannot satisfy seed constraints.

## Reused capabilities

- `verify_receipt_backed_entitlement` (#979)
- Proof-continuity Token-2022 mint, NonTransferable, issuance ledger (#978–#979)
- Existing #979 consumption ledger and ProgramTest harness

## Programs / instructions

| Instruction | Program |
|-------------|---------|
| `initialize_trusted_config` / `update_trusted_config` | `abraxas_proof_entitlement_consumer` |
| `consume_verified_entitlement` (hardened accounts) | `abraxas_proof_entitlement_consumer` |

## Tests

`npm run test:build-980` → `tokenization_entitlement.rs` (20 cases): all #979 scenarios preserved plus eight `build980_*` adversarial consumption paths (foreign registry, rogue trusted config, forged commitment, unauthorized config update, wrong config PDA, revoke/expire before consume, etc.).

## Remaining limitations

- Relying-party admin key compromise allows trusted-scope rotation (by design for partner-operated config).
- Consumer does not fetch off-chain receipt metadata; on-chain commitment + issuer semantics remain the authority source.
- No mainnet deployment or production config in this build.