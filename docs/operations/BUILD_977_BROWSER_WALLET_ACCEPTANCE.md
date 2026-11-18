# BUILD #977 — Founder browser wallet acceptance

## Scope

Prove the **Integration Studio** blockchain-native path end-to-end in a **real browser** with a **supported Solana wallet extension** (e.g. Phantom). This is distinct from:

- `npm run accept:build-976-local` (holder keypair + local validator), and
- Merging #976 as a **local integration milestone** (not demo-ready / not public-chain).

No public devnet/mainnet deployment, no sovereign PostgreSQL changes, no new paid infrastructure.

## Preconditions

1. **#976 merged** to `main` (HEAD includes `d93894e2` acceptance fixes).
2. **Local validator** (same program id as repo):
   ```bash
   export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
   cargo build-sbf --manifest-path solana/abraxas-eligibility-gate/programs/abraxas-proof-continuity/Cargo.toml
   solana-test-validator --ledger /tmp/abraxas-build977-ledger --reset --quiet \
     --rpc-port 8899 --faucet-sol 1000000 \
     --bpf-program FtDugarhArqNTeuGzvQhFV9wQAxTFn8bifhPrCH4dhd1 \
     solana/abraxas-eligibility-gate/target/deploy/abraxas_proof_continuity.so
   ```
3. **App env** (preview/local `.env.local`, not production):
   - `ABRAXAS_PROOF_CONTINUITY_RPC_URL=http://127.0.0.1:8899`
   - `ABRAXAS_PROOF_CONTINUITY_REGISTRY_ADMIN=<registry admin pubkey>`
   - `ABRAXAS_PROOF_CONTINUITY_FINALITY_SLOTS=0` (localnet) or `1`
   - `BLOCKCHAIN_NATIVE_PREPARE_HMAC_KEY` (≥32 bytes, dedicated)
   - `ABRAXAS_SIGNING_KEY` / trust anchor / status / issuer material (demo sandbox set)
   - Ephemeral **Redis/KV** for distributed confirm store in multi-instance preview (Upstash or local Redis URL)
4. **Ephemeral wallet auth** operational for Integration Studio.
5. Browser: **desktop** and **mobile** viewports; wallet extension installed and funded on devnet/localnet as needed.

## Founder journey (must complete manually)

1. Open Integration Studio → **Blockchain-native Launchpad continuity** path.
2. **Sign in** wallet session (same holder as extension).
3. **Authorize** sandbox action (wallet message sign for `abraxas:launchpad:{applicationId}:blockchain-native`).
4. **Prepare** → note **receipt ID**.
5. **Build transaction** → extension **sign + send**.
6. Wait for **finalized** execution.
7. **Confirm** → independent verification **fully accepts**.
8. **Export** portable receipt evidence.
9. **Refresh** page → **resume** prepared state if applicable; duplicate confirm idempotent.
10. **Recovery**: reject tx once, switch wallet (must fail), retry success.

## Evidence to capture

| Artifact | Required |
|----------|----------|
| Receipt ID | yes |
| Transaction signature | yes |
| Finalized slot (from confirm response) | yes |
| Independent verification summary (`currently_acceptable`, permit) | yes |
| Desktop screenshot (success outcome) | yes |
| Mobile screenshot (success outcome) | yes |
| Screenshot or clip: wallet rejection / wrong wallet failure | yes |
| Screenshot: duplicate confirm (idempotent success, no double execution) | optional |

Save under project artifacts or founder store `media/build-977/`. Fill template:

```json
{
  "build": 977,
  "sha": "<main-after-merge>",
  "receipt_id": "",
  "transaction_signature": "",
  "finalized_slot": 0,
  "independent_verification_fully_accepts": true,
  "wallet_product": "phantom",
  "viewport": ["desktop", "mobile"],
  "remaining_issues": []
}
```

## Automated assists (not substitutes)

- `npm run accept:build-976-local` — chain + confirm regression between #976 and browser pass.
- `npm run test:build-976` — unit/integration guards.
- Playwright `tests/staging/integration-studio-blockchain-native.spec.ts` — path visibility only until env + wallet harness exists.

## GO / NO-GO for “demo-ready”

| Gate | Requirement |
|------|----------------|
| Founder browser journey | **GO** only with evidence above |
| Local keypair acceptance alone | **NO-GO** for demo-ready (milestone #976 only) |
| Public chain deploy | **NO-GO** without separate founder approval |