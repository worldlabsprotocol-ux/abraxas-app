# BUILD #976 — Blockchain-native Integration Studio (local/reference)

## Scope

Wire Integration Studio to the **proof-continuity** path merged in #975: prepare portable harness issuance, execute on pinned Solana RPC, fetch live accounts (no caller-supplied bytes), and confirm with **real** `verifyAbraxasReceiptIndependently` + on-chain commitment binding.

Default hosted Launchpad (`launchpadUsesSovereignPostgres()`) is unchanged.

## Studio path

| Item | Value |
|------|--------|
| Integration Studio path id | `blockchain_native_launchpad` |
| API | `POST /api/launchpad/applications/{id}/blockchain-native-execution` (`prepare` / `build_transaction` / `confirm`) |
| RPC env | `ABRAXAS_PROOF_CONTINUITY_RPC_URL` |
| Registry admin env | `ABRAXAS_PROOF_CONTINUITY_REGISTRY_ADMIN` |
| Finality slots | `ABRAXAS_PROOF_CONTINUITY_FINALITY_SLOTS` (default 32) |
| Portable verify material | `buildDemoTrustAnchorFromEnv`, `ABRAXAS_SIGNED_ISSUER_AUTHORITY_JSON`, `ABRAXAS_SIGNED_STATUS_STATEMENT_JSON` |
| Issuer signing | `ABRAXAS_SIGNING_KEY` (unchanged; no production signing changes) |
| Prepare binding HMAC | `BLOCKCHAIN_NATIVE_PREPARE_HMAC_KEY` (≥32 bytes; independent of receipt signing) |
| Confirm idempotency / JTI tx bind | Ephemeral Redis/KV (`UPSTASH_*` or `REDIS_URL`); required in distributed production |

## Replay and authorization

- **Authoritative execution replay** remains the on-chain execution nonce + receipt commitment (a consumed nonce cannot be re-executed on chain).
- **Prepare binding JTI → transaction signature** is stored in ephemeral Redis with `SET NX` so the same prepare token cannot confirm two different signatures across Vercel instances.
- **Duplicate confirm** (same receipt + signature) is idempotent via a distributed confirm cache; no second independent verify pass is fabricated.
- **Prepare** requires wallet session + signed **action authorization** (`sandbox:verification:test` on `abraxas:launchpad:{applicationId}:blockchain-native`). Build/confirm reject holder addresses that do not match the authenticated session wallet.

## Journey (builder)

1. Connect wallet session (existing `/api/auth/wallet/session` gate).
2. Sign wallet action authorization for the blockchain-native sandbox resource.
3. **Prepare** — server issues portable signed receipt + PDA hints (no sovereign PostgreSQL persistence).
3. **Build transaction** — server builds issuer Ed25519 + `execute_harness_run` instructions bound to HMAC `prepare_token` (holder, nonce, receipt).
4. **Wallet execute** — browser wallet signs and submits; Abraxas waits for **finalized** status.
5. **Confirm** — server proves the submitted transaction executed the prepared commitment, then fetches accounts from pinned RPC and requires full independent verifier acceptance.

## Proof

```bash
cd solana/abraxas-eligibility-gate
cargo test --test proof_continuity --test blockchain_native_journey -- --nocapture
```

```bash
npm run test:build-976
```

## GO / NO-GO

| Gate | Status |
|------|--------|
| Live RPC account fetch + authentication | **GO** (when validator + env configured) |
| Integration Studio UI prepare/confirm | **GO** (local/reference) |
| Browser wallet-built `execute_harness_run` tx | **GO** (when local validator + env configured) |
| Public devnet/mainnet deploy | **NO-GO** (founder approval) |

## Distinction from #975

#975 landed program + adapters on `main`. #976 exposes them through Integration Studio and closes the verification gap (real RPC + portable bundle), without reopening the PostgreSQL default path.