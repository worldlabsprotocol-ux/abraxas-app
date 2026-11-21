# BUILD #987 — non-production activation decision

Observed on 2026-11-21 from merged main `a17258cb978fcbc52527792e9b8f6289e090cd03`. This is an execution decision, not connected-chain acceptance. No cluster, wallet, deployment, funding, or Production state was changed.

## Decision

**NO-GO for public-cluster activation today.** Devnet is the next operational target. Reuse the existing ProgramTest and Redis security gates; an additional local-validator cycle is optional, not a prerequisite for the first connected Devnet acceptance. Obtain the existing program binaries, artifact attestations, cost quote, and founder approval before any Devnet deployment. A local result cannot establish Devnet acceptance.

## Evidence and blockers

| Check | Observed result |
| --- | --- |
| Existing connected sandbox operator environment | `build-985:preflight` reports `NOT_CONFIGURED`: RPC, registry/relying-party admins, HMAC, genesis/ELF attestations absent; distributed KV backend `none`. |
| Local validator | `solana-test-validator` and `solana` not installed; WSL access denied. No local validator transaction was run. |
| Program artifacts | CI run `44923423922` passed and uploaded both candidate ELFs. The entitlement artifact was downloaded with GitHub CLI and both files' lengths and SHA-256 independently matched the CI output below. Historic hashes in BUILD #985 do not attest these new bytes. |
| Devnet identity | Read-only public RPC `getGenesisHash` returned `EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG`. Pin and recheck at activation. |
| Expected Devnet programs | Read-only `getAccountInfo` returned no account for proof continuity `FtDugarhArqNTeuGzvQhFV9wQAxTFn8bifhPrCH4dhd1` or entitlement consumer `CQykNfMtvoV4NV6fR3cJDB5dp5ZS7oeKh8whVwpZZc8T`. |
| Redis distributed replay | Redis executable/listener and configured KV URL absent here. BUILD #986 Lua integration acceptance was not rerun against real Redis. |
| Local automated tests | Could not run in this checkout: shared older dependencies lack `@upstash/redis` and `@solana/web3.js`; `npm ci` failed with Windows `EPERM` creating `node_modules`. Existing merged CI remains separate evidence. |
| Browser journey | Not performed. No wallet-signed mint, consumption, independent partner verification, or revocation transaction occurred. |

The read-only preflight originally failed on Windows because it unconditionally created `/opt/cursor/artifacts`, even when `BUILD_985_PREFLIGHT_OUT` named a local file. It now creates the selected output file's parent directory. Its `NOT_CONFIGURED` result is the expected fail-closed outcome.

## Candidate artifacts and deployment authority

The pinned-toolchain CI job in [run 44923423922](https://github.com/worldlabsprotocol-ux/abraxas-app/actions/runs/44923423922) completed successfully. `gh run download 44923423922 -n solana-entitlement-candidates-4e34dc479aa52ea6f22846e14f3834cf457d65f8` retrieved the archive to an isolated directory. `Get-FileHash -Algorithm SHA256` and file lengths independently matched the job output:

| Program | Repository program ID | ELF bytes | CI SHA-256 |
| --- | --- | ---: | --- |
| Proof continuity | `FtDugarhArqNTeuGzvQhFV9wQAxTFn8bifhPrCH4dhd1` | 421,384 | `dd6d9ecb4392663ca0b667362280eb158848bc9390ee0080abab8cf54838d00b` |
| Entitlement consumer | `CQykNfMtvoV4NV6fR3cJDB5dp5ZS7oeKh8whVwpZZc8T` | 295,688 | `67995bf80bed80d6f37b3b0eb378b9da328f59cccef9ac433ad25f2faf7a9cce` |

The IDs match the programs' `declare_id!` values, `Anchor.toml`, and TypeScript constants; this does **not** prove custody of the corresponding private signers. Neither program account exists on the probed Devnet RPC. No matching program-address keypair is tracked in the repository; no operator-controlled keypair custody or administrator public key was available in this environment. Deploying at those fixed IDs requires each corresponding program-address signer (supplied through `solana program deploy --program-id`), a fee payer, and a chosen upgrade-authority signer. The upgrade-authority public key cannot be read from an account that has not yet been deployed. The proof registry and relying-party administrator public keys must also be named before initialization. **No replacement ID or signer may be generated silently.**

## Solana-native boundary

The existing proof program already initializes Token-2022 `NonTransferable` and uses the associated token program (`programs/abraxas-proof-continuity/src/lib.rs`). The existing consumer checks trusted registry/partner/policy/application scope, receipt-backed entitlement validity, holder token ownership, and single-use state (`programs/abraxas-proof-entitlement-consumer/src/lib.rs`). **Reuse** these Solana rails; do not build another token lifecycle or consumer. **Keep** private evidence and issuer/policy evaluation off-chain where Solana cannot establish their truth. **Keep** signed receipt commitments and current on-chain revocation/consumption checks for independent relying parties.

The Redis Lua bundle in `connectedSandboxAtomicBundle.ts` coordinates short-lived off-chain prepare generations, message hashes, signature binding, and idempotent confirmation across server instances. Solana transaction uniqueness does not automatically make a superseded *off-chain* preparation invalid. **Simplify later only if** an exact wallet-signed, chain-bound authorization flow proves the same tenant/policy binding, supersession, concurrency, and failure semantics without the distributed store. That is a separate measurable change, not a prerequisite for Devnet activation.

## Exact activation order

1. Retrieve the two candidate ELFs from the existing pinned-toolchain CI artifact after its check passes. Independently record each byte length and SHA-256, confirm the program source revision and repository IDs, and identify operator-controlled program-address keypairs and upgrade authorities without exporting private keys. Do not reuse historic hashes without byte-for-byte confirmation.
2. Use the actual ELF sizes and account allocations to query Devnet rent and transaction fees. Confirm the public genesis, both program accounts' current absence or state, administrator public keys, balances, Redis availability, and verifier configuration. Run the existing #981–#986 security gates. A local validator rehearsal may help diagnose an issue but must not delay connected acceptance once these gates and review pass.
3. Present the exact bounded Devnet deployment and funding packet to the founder. **Stop for approval.** After approval only, deploy the two reviewed ELFs at the repository IDs; initialize proof registry, Token-2022 entitlement mint/configuration, and trusted relying-party configuration for the intended partner, policy, and application. Confirm account owners, authorities, and bindings from RPC state.
4. Pin non-production RPC, public administrator keys, prepare HMAC, ELF digests, and Lua-capable Redis. Run `build-985:preflight`. Execute one holder-wallet mint and independent consumer transaction on Devnet. Fetch finalized transaction/account state and run `examples/independent-solana-entitlement-partner` with independently pinned program, issuer, policy, wallet, and cluster authority. Test wrong wallet, superseded preparation, duplicate confirmation, revoked/expired evidence, and Redis interruption. Record transaction signatures and verifier output, excluding secrets.
5. Review the five-step Integration Studio journey against this connected evidence. Never label ProgramTest, a local validator, or a hosted API response `CONNECTED SANDBOX VERIFIED`.

## Cost and founder approval packet

The measured ELFs allow a **rent model**, assuming explicit `--max-len` equal to each ELF byte length (no initial upgrade headroom). Read-only Devnet `getMinimumBalanceForRentExemption` calls on 2026-11-21 returned:

| Allocation | Bytes | Rent-exempt Devnet SOL |
| --- | ---: | ---: |
| Two upgradeable Program accounts | 36 each | 0.00166624 total |
| Proof ProgramData | 45 + 421,384 | 2.14150956 |
| Consumer ProgramData | 45 + 295,688 | 1.50297388 |
| Two temporary deployment buffers | 37 + each ELF | 3.64440216 total |
| One registry, trusted relying-party config, mint config, receipt commitment, issuance ledger, consumption account, and Token-2022 mint | 177, 177, 74, 250, 105, 122, 278 | 0.01056132 total |

The **3.64614968 Devnet SOL** Program plus ProgramData figure is a lower bound, **not an approved deployment budget**. The enumerated permanent account subtotal is 3.65671100 Devnet SOL; if both deployment buffers must be funded concurrently, the observed-size subtotal reaches 7.30111316 Devnet SOL before the holder token account and fees. The Token-2022 associated token account receives required extensions from the non-transferable mint; its exact size/rent must be obtained from the actual mint initialization, not assumed from a legacy 165-byte token account. Additional required accounts, any larger `max-len`, payer balance, deployment transaction fees, and retries must be included before specifying an exact funding transfer. These figures do not represent real-money SOL.

For planning only, a 174-byte Token-2022 account carrying `NonTransferableAccount` and `ImmutableOwner` would cost 0.00153416 Devnet SOL at the queried rent rate, bringing the modeled permanent subtotal to **3.65824516 Devnet SOL** and a conservative concurrent-buffer peak to **7.30264732 Devnet SOL**. Confirm that size through the Token-2022 account-size instruction or actual initialized mint before approval. The 0.01209548 Devnet SOL initialization estimate includes one each of registry, trusted config, mint config, receipt commitment, issuance ledger, consumption account, Token-2022 mint, and modeled holder token account. It does not include additional accounts a final transaction plan may require.

Transaction fees must be quoted with `getFeeForMessage` or the Solana CLI against the actual deployment and initialization messages. A provisional **8 Devnet SOL ceiling** would leave less than 0.7 Devnet SOL beyond the enumerated concurrent rent, but it is **not a funding request or approval packet** until signer addresses, balances, token account rent, actual messages, and buffer sequencing are verified. If the program-address signers are unavailable, deployment at the fixed IDs is blocked regardless of balance.

The official [Devnet CLI guidance](https://solana.com/docs/intro/installation/solana-cli-basics) states a **5 Devnet SOL per request** limit; the [web faucet](https://faucet.solana.com/) displays **at most two requests every eight hours** without increased access. Two successful 5 SOL CLI requests could cover the modeled 8 Devnet SOL ceiling from an empty payer wallet, but this is not a guaranteed rate or balance. The operator must first identify the payer public key and query its actual balance. No faucet request was made.

Recurring cost is **unverified**: the public Devnet RPC is suitable for this read-only probe, not an operational service-level commitment. Reuse an existing authorized Redis/RPC service if available; otherwise quote its actual monthly charge before approval. No paid RPC or Redis purchase is authorized here.

The approval packet must name Devnet genesis, both ELF hashes and program IDs, registry/relying-party/upgrade authority public keys, funding wallet and exact required SOL, one-time and monthly cost, holder/admin signature steps, independent verifier endpoint and expected evidence, and recovery plan. Recovery is to disable connected execution, stop funding, revoke affected authority/configuration and receipts where applicable, and inspect deployed buffer/program accounts; a deployment cannot be treated as automatically reversible.

**Founder decision pending:** approve only a fully quantified non-production Devnet activation after reviewed CI artifacts and existing security gates. No public deployment, funding, key provisioning, or Production change is authorized by this report.
