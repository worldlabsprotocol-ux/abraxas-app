# BUILD #987 — non-production activation decision

Observed on 2026-11-21 from merged main `a17258cb978fcbc52527792e9b8f6289e090cd03`. This is an execution decision, not connected-chain acceptance. No cluster, wallet, deployment, funding, or Production state was changed.

## Decision

**NO-GO for public-cluster activation today.** Devnet is the next operational target. Reuse the existing ProgramTest and Redis security gates; an additional local-validator cycle is optional, not a prerequisite for the first connected Devnet acceptance. Obtain the existing program binaries, artifact attestations, cost quote, and founder approval before any Devnet deployment. A local result cannot establish Devnet acceptance.

## Evidence and blockers

| Check | Observed result |
| --- | --- |
| Existing connected sandbox operator environment | `build-985:preflight` reports `NOT_CONFIGURED`: RPC, registry/relying-party admins, HMAC, genesis/ELF attestations absent; distributed KV backend `none`. |
| Local validator | `solana-test-validator` and `solana` not installed; WSL access denied. No local validator transaction was run. |
| Program artifacts | Both program sources and IDs exist; neither `target/deploy/*.so` file is present in this checkout. Historic hashes in BUILD #985 cannot attest a newly built ELF. This PR extends the existing pinned-toolchain CI job to build and upload candidate ELFs and print their byte lengths and SHA-256; its output remains unverified until CI completes. |
| Devnet identity | Read-only public RPC `getGenesisHash` returned `EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG`. Pin and recheck at activation. |
| Expected Devnet programs | Read-only `getAccountInfo` returned no account for proof continuity `FtDugarhArqNTeuGzvQhFV9wQAxTFn8bifhPrCH4dhd1` or entitlement consumer `CQykNfMtvoV4NV6fR3cJDB5dp5ZS7oeKh8whVwpZZc8T`. |
| Redis distributed replay | Redis executable/listener and configured KV URL absent here. BUILD #986 Lua integration acceptance was not rerun against real Redis. |
| Local automated tests | Could not run in this checkout: shared older dependencies lack `@upstash/redis` and `@solana/web3.js`; `npm ci` failed with Windows `EPERM` creating `node_modules`. Existing merged CI remains separate evidence. |
| Browser journey | Not performed. No wallet-signed mint, consumption, independent partner verification, or revocation transaction occurred. |

The read-only preflight originally failed on Windows because it unconditionally created `/opt/cursor/artifacts`, even when `BUILD_985_PREFLIGHT_OUT` named a local file. It now creates the selected output file's parent directory. Its `NOT_CONFIGURED` result is the expected fail-closed outcome.

## Exact activation order

1. Retrieve the two candidate ELFs from the existing pinned-toolchain CI artifact after its check passes. Independently record each byte length and SHA-256, confirm the program source revision and repository IDs, and identify operator-controlled program-address keypairs and upgrade authorities without exporting private keys. Do not reuse historic hashes without byte-for-byte confirmation.
2. Use the actual ELF sizes and account allocations to query Devnet rent and transaction fees. Confirm the public genesis, both program accounts' current absence or state, administrator public keys, balances, Redis availability, and verifier configuration. Run the existing #981–#986 security gates. A local validator rehearsal may help diagnose an issue but must not delay connected acceptance once these gates and review pass.
3. Present the exact bounded Devnet deployment and funding packet to the founder. **Stop for approval.** After approval only, deploy the two reviewed ELFs at the repository IDs; initialize proof registry, Token-2022 entitlement mint/configuration, and trusted relying-party configuration for the intended partner, policy, and application. Confirm account owners, authorities, and bindings from RPC state.
4. Pin non-production RPC, public administrator keys, prepare HMAC, ELF digests, and Lua-capable Redis. Run `build-985:preflight`. Execute one holder-wallet mint and independent consumer transaction on Devnet. Fetch finalized transaction/account state and run `examples/independent-solana-entitlement-partner` with independently pinned program, issuer, policy, wallet, and cluster authority. Test wrong wallet, superseded preparation, duplicate confirmation, revoked/expired evidence, and Redis interruption. Record transaction signatures and verifier output, excluding secrets.
5. Review the five-step Integration Studio journey against this connected evidence. Never label ProgramTest, a local validator, or a hosted API response `CONNECTED SANDBOX VERIFIED`.

## Cost and founder approval packet

Exact SOL is **unverified** because the ELFs and account allocation sizes are absent. Once built, calculate one-time rent for each upgradeable Program and ProgramData account, registry, mint/configuration, trusted relying-party account, holder token account, and temporary deployment buffer using Devnet `getMinimumBalanceForRentExemption` at each actual allocated byte size. Add deployment/write/initialization and mint/consume transaction fees using signed-message fee quotes, with a buffer for failed transactions. Check balances before asking for a funding amount. ProgramData rent depends on deployed bytecode allocation and upgrade capacity; the deployment buffer is temporary. Do not infer Devnet cost from a different ELF build.

Recurring cost is **unverified**: the public Devnet RPC is suitable for this read-only probe, not an operational service-level commitment. Reuse an existing authorized Redis/RPC service if available; otherwise quote its actual monthly charge before approval. No paid RPC or Redis purchase is authorized here.

The approval packet must name Devnet genesis, both ELF hashes and program IDs, registry/relying-party/upgrade authority public keys, funding wallet and exact required SOL, one-time and monthly cost, holder/admin signature steps, independent verifier endpoint and expected evidence, and recovery plan. Recovery is to disable connected execution, stop funding, revoke affected authority/configuration and receipts where applicable, and inspect deployed buffer/program accounts; a deployment cannot be treated as automatically reversible.

**Founder decision pending:** approve only a fully quantified non-production Devnet activation after reviewed CI artifacts and existing security gates. No public deployment, funding, key provisioning, or Production change is authorized by this report.
