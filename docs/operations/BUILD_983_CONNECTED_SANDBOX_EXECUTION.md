# BUILD #983 — Connected sandbox Token-2022 execution

## Objective

Holder-wallet **mint** and **consume** against a pinned non-production Solana RPC when operator infrastructure is deployed.

## Configuration (server only)

| Variable | Purpose |
|----------|---------|
| `ABRAXAS_PROOF_CONTINUITY_RPC_URL` | Pinned sandbox RPC (https only) |
| `ABRAXAS_PROOF_CONTINUITY_REGISTRY_ADMIN` | Registry admin pubkey |
| `ABRAXAS_ENTITLEMENT_RELYING_PARTY_ADMIN` | Trusted relying-party config admin |
| `BLOCKCHAIN_NATIVE_PREPARE_HMAC_KEY` | Prepare token binding (existing) |
| `ABRAXAS_CONNECTED_SANDBOX_CLUSTER` | Label (e.g. `devnet-local`) |
| `ABRAXAS_CONNECTED_SANDBOX_GENESIS_HASH` | **Required** before `mint_and_consume_actionable` |
| `ABRAXAS_PROOF_CONTINUITY_PROGRAM_SHA256` | SHA-256 of deployed proof-continuity ELF |
| `ABRAXAS_ENTITLEMENT_CONSUMER_PROGRAM_SHA256` | SHA-256 of deployed entitlement-consumer ELF |
| `ABRAXAS_CONNECTED_SANDBOX_PROGRAM_SHA256` | Deprecated fallback for both program digests |

Program IDs are **allowlisted** to repository constants — browser cannot override.

## API

`POST /api/launchpad/applications/:id/token2022-connected-execution`

Phases: `capabilities` · `prepare_mint` · `confirm_mint` · `prepare_consume` · `confirm_consume`

Requires Launchpad session, holder wallet gate, and valid `prepare_token` from blockchain-native prepare flow.

## Operator deployment boundary

When `mint_and_consume_actionable` is false but programs exist:

1. Deploy `abraxas_proof_continuity.so` and `abraxas_proof_entitlement_consumer.so` to pinned cluster.
2. Initialize proof registry, entitlement mint config, trusted relying-party config (partner/policy/application hashes).
3. Set env vars above.

**No automatic deployment from Studio or CI.**

Artifacts: `solana/abraxas-eligibility-gate/target/deploy/*.so`

## Verification tiers after execution

1. Recorded signature (untrusted until re-fetched)
2. N/A for live step (offline snapshots not used for live mint)
3. RPC observation at configured sandbox (`finalized` / `confirmed`)

Confirmation **rejects** unrelated signatures: the server decodes the on-chain transaction, checks the expected Anchor instruction (program, accounts, receipt hash, holder signer), and verifies post-state (issuance ledger, Token-2022 balance, consumption flag). Upgradeable-loader ELF SHA-256 must match operator env before execution is actionable.

### Prepare-to-confirmation binding

Each `prepare_mint` / `prepare_consume` stores a durable record (ephemeral KV when configured, in-memory in dev/tests) keyed by prepare-token **JTI + action**, including the SHA-256 of the exact serialized transaction message, scope ids, receipt, and cluster label. Confirmation compares the on-chain message hash to that record and enforces one signature per JTI/action (idempotent retries for the same signature). A refreshed prepare overwrites the message hash — older successful transactions cannot confirm a newer preparation.

Confirm caches are keyed by **JTI + action + message hash + signature** and are only read after loading the current prepare record, so a superseded preparation cannot resurrect a prior cached success.

## Tests

```bash
npm run test:build-983
npm run test:build-981
npm run test:build-982
```

Optional local connected acceptance: `ABRAXAS_BUILD983_CONNECTED_ACCEPTANCE=1` (see integration test).

## Limitations

- Production and mainnet remain disabled.
- Revocation lifecycle on connected cluster requires issuer-operated revoke transactions (covered in ProgramTest; connected revoke is operator follow-up).