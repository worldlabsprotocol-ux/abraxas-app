# Build #537 — Trust Registry Governance Execution Runbook

## Scope

- **In scope:** Local SBF rehearsal, Squads v4 PDA/harness, preflight gates, integration tests.
- **Out of scope:** Abraxas devnet trust registry program upgrade, authority rotation, mainnet, new funded multisigs.

## Preconditions (fail-closed)

1. `npm run build:trust-registry-sbf` produces `abraxas_trust_registry.so` with recorded SHA-256.
2. `runGovernanceExecutionPreflight` passes: cluster genesis, program id, artifact hash, verified vault allowlist, multisig threshold.
3. Registry layout extended (`extend_registry_governance_layout`) before nomination.
4. Nomination `new_authority` is a **Squads v4 vault PDA** (not create_key).

## Squads v4 execution (devnet — blocked until ops)

1. Derive multisig PDA: seeds `[multisig, multisig, createKey]` under `SQDS4ep65T869zMMBKyuUq6aD6EgTu8psMjkvj52pCf`.
2. Derive vault PDA: seeds `[multisig, multisigPda, vault, index]`.
3. `vaultTransactionCreate` with accept instruction bytes from `buildAcceptGovernanceAuthorityIx`.
4. `proposalApprove` until threshold → state **EXECUTABLE**.
5. `vaultTransactionExecute` — capture signature, slot, post-state authority.
6. Independent RPC verify → **FINALIZED**.

## Local proof (no devnet Squads)

```bash
cargo test -p abraxas-eligibility-gate-integration-tests --test trust_registry_vault_pda_accept
cargo test -p abraxas-eligibility-gate-integration-tests --test trust_registry_upgrade_authority_rehearsal
npm run evidence:trust-registry-governance-execution-537
```

## Loader upgrade authority (separate proposal)

Use BPF Upgradeable Loader `set_authority` on **disposable** rehearsal program only. Production Abraxas program upgrade authority unchanged until explicit authorization.
