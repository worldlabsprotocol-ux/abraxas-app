# BUILD #976 — Blockchain-native Integration Studio (local/reference)

## Scope

Wire Integration Studio to the **proof-continuity** path merged in #975: prepare portable harness issuance, execute on pinned Solana RPC, fetch live accounts (no caller-supplied bytes), and confirm with **real** `verifyAbraxasReceiptIndependently` + on-chain commitment binding.

Default hosted Launchpad (`launchpadUsesSovereignPostgres()`) is unchanged.

## Studio path

| Item | Value |
|------|--------|
| Integration Studio path id | `blockchain_native_launchpad` |
| API | `POST /api/launchpad/applications/{id}/blockchain-native-execution` (`prepare` / `confirm`) |
| RPC env | `ABRAXAS_PROOF_CONTINUITY_RPC_URL` |
| Registry admin env | `ABRAXAS_PROOF_CONTINUITY_REGISTRY_ADMIN` |
| Finality slots | `ABRAXAS_PROOF_CONTINUITY_FINALITY_SLOTS` (default 32) |
| Portable verify material | `buildDemoTrustAnchorFromEnv`, `ABRAXAS_SIGNED_ISSUER_AUTHORITY_JSON`, `ABRAXAS_SIGNED_STATUS_STATEMENT_JSON` |
| Issuer signing | `ABRAXAS_SIGNING_KEY` (unchanged; no production signing changes) |

## Journey (builder)

1. Connect wallet session (existing `/api/auth/wallet/session` gate).
2. **Prepare** — server issues portable signed receipt + PDA hints (no sovereign PostgreSQL persistence).
3. **On-chain execute** — holder runs `execute_harness_run` against pinned local validator (CLI or wallet).
4. **Confirm** — server fetches registry + commitment from RPC, runs independent verifier, checks `verifyOnChainReceiptCommitment` binding.

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
| Browser wallet-built `execute_harness_run` tx | **NO-GO** (CLI handoff; founder-safe) |
| Public devnet/mainnet deploy | **NO-GO** (founder approval) |

## Distinction from #975

#975 landed program + adapters on `main`. #976 exposes them through Integration Studio and closes the verification gap (real RPC + portable bundle), without reopening the PostgreSQL default path.