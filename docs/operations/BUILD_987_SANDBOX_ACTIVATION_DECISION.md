# BUILD #987 — non-production activation decision

Observed on 2026-11-21 from merged main `a17258cb978fcbc52527792e9b8f6289e090cd03`. This is an execution decision, not connected-chain acceptance. No cluster, wallet, deployment, funding, or Production state was changed.

## Decision

**NO-GO for public-cluster activation.** Use an isolated local validator for the first transaction rehearsal once the existing program binaries and validator tooling are available. Use Devnet for independently accessible connected-cluster acceptance only after the local journey, artifact attestation, cost quote, and founder approval. A local result cannot establish Devnet acceptance.

## Evidence and blockers

| Check | Observed result |
| --- | --- |
| Existing connected sandbox operator environment | `build-985:preflight` reports `NOT_CONFIGURED`: RPC, registry/relying-party admins, HMAC, genesis/ELF attestations absent; distributed KV backend `none`. |
| Local validator | `solana-test-validator` and `solana` not installed; WSL access denied. No local validator transaction was run. |
| Program artifacts | Both program sources and IDs exist; neither `target/deploy/*.so` file is present in this checkout. Historic hashes in BUILD #985 cannot attest a newly built ELF. |
| Devnet identity | Read-only public RPC `getGenesisHash` returned `EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG`. Pin and recheck at activation. |
| Expected Devnet programs | Read-only `getAccountInfo` returned no account for proof continuity `FtDugarhArqNTeuGzvQhFV9wQAxTFn8bifhPrCH4dhd1` or entitlement consumer `CQykNfMtvoV4NV6fR3cJDB5dp5ZS7oeKh8whVwpZZc8T`. |
| Redis distributed replay | Redis executable/listener and configured KV URL absent here. BUILD #986 Lua integration acceptance was not rerun against real Redis. |
| Local automated tests | Could not run in this checkout: shared older dependencies lack `@upstash/redis` and `@solana/web3.js`; `npm ci` failed with Windows `EPERM` creating `node_modules`. Existing merged CI remains separate evidence. |
| Browser journey | Not performed. No wallet-signed mint, consumption, independent partner verification, or revocation transaction occurred. |

The read-only preflight originally failed on Windows because it unconditionally created `/opt/cursor/artifacts`, even when `BUILD_985_PREFLIGHT_OUT` named a local file. It now creates the selected output file's parent directory. Its `NOT_CONFIGURED` result is the expected fail-closed outcome.

## Exact activation order

1. In an isolated engineering environment, obtain the existing Solana CLI/validator and build both repository programs reproducibly. Record each ELF byte length and SHA-256, both program keypair public IDs, and operator-controlled upgrade authorities. Do not reuse the historic ELF hashes without byte-for-byte confirmation.
2. Start a local validator; record its genesis hash. Deploy the two approved ELFs at the repository IDs. Initialize the proof registry, Token-2022 entitlement mint/configuration, and trusted relying-party configuration for the intended partner, policy, and application. Confirm all account owners, authorities, and bindings from RPC state.
3. Configure only local non-production RPC, administrator public keys, a prepare HMAC, ELF pins, and a Lua-capable Redis store. Run `build-985:preflight`, then the existing #981–#986 focused suites and real Redis concurrency suite. A preflight readiness result is not a verified transaction.
4. Execute one actual holder-wallet mint and independent consumer transaction on the local validator. Fetch finalized transaction/account state. Run `examples/independent-solana-entitlement-partner` with independently pinned program, issuer, policy, wallet, and cluster authority. Test wrong wallet, superseded preparation, duplicate confirmation, revoked/expired evidence, and Redis interruption. Record transaction signatures and verifier output, excluding secrets.
5. Repeat the cost and authority review for Devnet, request founder approval for the precise deployment/funding/configuration, then deploy and run the same wallet and independent verifier journey there. Never label local ProgramTest or a hosted API response `CONNECTED SANDBOX VERIFIED`.

## Cost and founder approval packet

Exact SOL is **unverified** because the ELFs and account allocation sizes are absent. Once built, calculate one-time rent for each upgradeable Program and ProgramData account, registry, mint/configuration, trusted relying-party account, holder token account, and temporary deployment buffer using Devnet `getMinimumBalanceForRentExemption` at each actual allocated byte size. Add deployment/write/initialization and mint/consume transaction fees using signed-message fee quotes, with a buffer for failed transactions. Check balances before asking for a funding amount. ProgramData rent depends on deployed bytecode allocation and upgrade capacity; the deployment buffer is temporary. Do not infer Devnet cost from a different ELF build.

Recurring cost is **unverified**: the public Devnet RPC is suitable for this read-only probe, not an operational service-level commitment. Reuse an existing authorized Redis/RPC service if available; otherwise quote its actual monthly charge before approval. No paid RPC or Redis purchase is authorized here.

The approval packet must name Devnet genesis, both ELF hashes and program IDs, registry/relying-party/upgrade authority public keys, funding wallet and exact required SOL, one-time and monthly cost, holder/admin signature steps, independent verifier endpoint and expected evidence, and recovery plan. Recovery is to disable connected execution, stop funding, revoke affected authority/configuration and receipts where applicable, and inspect deployed buffer/program accounts; a deployment cannot be treated as automatically reversible.

**Founder decision pending:** approve only a fully quantified non-production Devnet activation after local transaction evidence. No public deployment, funding, key provisioning, or Production change is authorized by this report.

