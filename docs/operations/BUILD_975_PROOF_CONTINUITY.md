# BUILD #975 — Blockchain-native Launchpad prototype (local/reference)

## Scope

Local **end-to-end blockchain-native execution prototype**: wallet sandbox binding, monotonic execution ledger, harness run → durable receipt commitment, portable verification, and on-chain continuity checks. No private receipt bodies on-chain. Does **not** replace `launchpadUsesSovereignPostgres()` or the default hosted Launchpad path.

Enable the TypeScript adapter only with `ABRAXAS_BLOCKCHAIN_NATIVE_PROTOTYPE=1` (see `lib/partner/launchpad/blockchainNative/`).

## Program (`abraxas_proof_continuity`)

| Item | Value |
|------|--------|
| Localnet program id | `FtDugarhArqNTeuGzvQhFV9wQAxTFn8bifhPrCH4dhd1` |
| Registry PDA | `["proof_registry", admin_pubkey]` |
| Commitment PDA | `["receipt_commitment", registry, receipt_id_hash]` |
| Sandbox PDA | `["sandbox_binding", registry, holder_pubkey]` |
| Execution ledger PDA | `["execution_ledger", sandbox]` |

### On-chain state

- **ProofContinuityRegistry** — admin, trusted issuer Ed25519 pubkey, partner/policy/application scope hashes, registry version.
- **SandboxBinding** — wallet holder bound to registry scope (partner/policy/application hashes).
- **ExecutionLedger** — per-sandbox monotonic `last_execution_nonce` (replay/idempotency gate).
- **ReceiptCommitment** — payload hash (32 bytes), scope hashes, `expires_at`, status (`active` / `revoked` / `expired`), monotonic `status_version`.

### Authorization

- **register_sandbox_binding** — holder wallet pays and signs; scope copied from registry.
- **execute_harness_run** — holder signs; issuer Ed25519 over commitment message including `execution_nonce`; advances ledger; initializes commitment.
- **commit_receipt** — wallet `committer` signs the transaction; prior instruction must be **Ed25519** over `ABRAXAS_PROOF_CONTINUITY_V1` message; pubkey must match registry `trusted_issuer_pubkey`. Wallet connection alone is not sufficient.
- **update_receipt_status** — same Ed25519 pattern; `status_version` must increase.
- **assert_receipt_commitment** — read-only scope + active + unexpired check (for independent verifiers / CPI).

## TypeScript adapters

- `lib/solana/proofContinuity/` — message encoding, account decode, `verifyOnChainReceiptCommitment()` (fails closed).
- `lib/partner/launchpad/blockchainNative/` — parallel harness adapter; PostgreSQL dependency matrices in `contract.ts`.

## PostgreSQL (default path unchanged)

| Retained (hosted Launchpad) | Eliminated only on blockchain-native adapter path |
|----------------------------|---------------------------------------------------|
| Sovereign issuance / sessions / org membership | Harness receipt row insert as authority |
| Private evidence and audit retention | DB-backed replay nonce as authority |
| Integration Studio default execution | Sovereign verification transaction gate |

Full receipt evidence remains **off-chain** (`OFF_CHAIN_EVIDENCE_MECHANISM` in `contract.ts`); chain hashes are not sufficient alone.

## Proof

```bash
cd solana/abraxas-eligibility-gate
cargo test --test proof_continuity --test blockchain_native_journey -- --nocapture
```

```bash
npm run test:build-975
```

## GO / NO-GO (demo deployment)

| Gate | Status |
|------|--------|
| Local ProgramTest journey (real txs) | **GO** |
| Adversarial replay / duplicate commitment | **GO** (ledger + existing commitment) |
| Integration Studio wired to adapter | **NO-GO** (not in scope) |
| Public devnet/mainnet deploy | **NO-GO** (founder approval) |
| Demo issuance without sovereign PostgreSQL | **NO-GO** (unchanged) |

## Reused components

- `abraxas-eligibility-gate::canonical::extract_ed25519_pubkey_and_message`
- Portable verifier package (`packages/abraxas-independent-verifier`)
- ProgramTest patterns from `integration-tests/tests/protocol_access.rs`

## Blockers

- **Public devnet/mainnet deploy** — founder approval only.
- **Launchpad demo issuance** — still requires sovereign PostgreSQL on demo env (unchanged).