# BUILD #975 — Solana proof continuity (local/reference)

## Scope

Isolated **receipt payload hash + status version** continuity on Solana. No private receipt bodies on-chain. Does **not** replace `launchpadUsesSovereignPostgres()` or Launchpad operational persistence.

## Program (`abraxas_proof_continuity`)

| Item | Value |
|------|--------|
| Localnet program id | `FtDugarhArqNTeuGzvQhFV9wQAxTFn8bifhPrCH4dhd1` |
| Registry PDA | `["proof_registry", admin_pubkey]` |
| Commitment PDA | `["receipt_commitment", registry, receipt_id_hash]` |

### On-chain state

- **ProofContinuityRegistry** — admin, trusted issuer Ed25519 pubkey, partner/policy/application scope hashes, registry version.
- **ReceiptCommitment** — payload hash (32 bytes), scope hashes, `expires_at`, status (`active` / `revoked` / `expired`), monotonic `status_version`.

### Authorization

- **commit_receipt** — wallet `committer` signs the transaction; prior instruction must be **Ed25519** over `ABRAXAS_PROOF_CONTINUITY_V1` message; pubkey must match registry `trusted_issuer_pubkey`. Wallet connection alone is not sufficient.
- **update_receipt_status** — same Ed25519 pattern; `status_version` must increase.
- **assert_receipt_commitment** — read-only scope + active + unexpired check (for independent verifiers / CPI).

## TypeScript adapter

`lib/solana/proofContinuity/` — message encoding, account decode, optional `verifyOnChainReceiptCommitment()` layered on the portable independent verifier (fails closed).

## Proof

```bash
cd solana/abraxas-eligibility-gate
cargo test --test proof_continuity -- --nocapture
```

```bash
npx vitest run lib/solana/proofContinuity/verifyOnChainCommitment.test.ts
```

## Reused components

- `abraxas-eligibility-gate::canonical::extract_ed25519_pubkey_and_message`
- Portable verifier package (`packages/abraxas-independent-verifier`)
- ProgramTest patterns from `integration-tests/tests/protocol_access.rs`

## Blockers

- **Public devnet/mainnet deploy** — founder approval only.
- **Launchpad demo issuance** — still requires sovereign PostgreSQL on demo env (unchanged).