# Foundational engineering consolidation

**Baseline:** `d7afbc8bc6a7b4c726f77914f8b0bf85022f9574`
**Scope:** repository execution paths and release tooling only; no live configuration, signing, migration, or deployment.

## Canonical execution path

| Stage | Current evidence | Classification | Boundary |
|---|---|---|---|
| Wallet connection and ordinary Passport authentication | `app/api/auth/passport-solana/challenge/route.ts`, `verify/route.ts`, and `lib/auth/passportSolanaAuth/walletNative.ts` | **KEEP** | Wallet-native sign-in is separate from the chain-neutral identity schema path. Challenges remain short-lived, context-bound, signed, and one-time. |
| Action-scoped wallet authorization | `lib/auth/walletAuthorization/scopedChallengeLifecycle.ts` and `scopedChallengePostgresStore.ts` | **CONSOLIDATE** | The in-memory store is process-local; durable institutional execution uses atomic sovereign storage. It must not be confused with ordinary sign-in. |
| Application and policy selection | `lib/partner/trustExecution/partnerTrustExecutionService.ts` | **KEEP** | Resolves the active application, policy ID, policy version, origin, network, wallet, and action before authorization. |
| Partner authorization and execution | `app/api/v1/partner-flow/trust-execution/{authorize,execute}/route.ts` and `lib/partner/trustExecution/` | **KEEP** | Authorization permits evaluation only. Execution fails closed and returns portable verification material only after authoritative evaluation. |
| Solana authorization and consumption | `solana/abraxas-eligibility-gate/programs/abraxas-eligibility-gate/` and `abraxas-protocol-access/` | **BLOCKED** | Source and migration repairs are merged. Public devnet activation remains separately gated by the protected upgrade authority and controlled migrations. |
| Portable receipt creation | `lib/decisionReceipts/`, `lib/partner/portableIndependentVerification/`, and trust-execution execution route | **KEEP** | Signed receipt, issuer authority, status, application/policy binding, and evidence commitments remain required. |
| Independent verification | `packages/abraxas-independent-verifier/src/` and `lib/decisionReceipts/independentVerifierBridge.ts` | **KEEP** | Verification is package-driven and does not require trusting the Abraxas UI. Current validity still requires authoritative signed status or finalized chain state. |
| Revocation, expiry, replay, and supersession | Solana ProgramTest suites plus `lib/decisionReceipts/currentValidity/` and independent-verifier adversarial suites | **KEEP** | These are release invariants, not optional UI behavior. |
| Private institutional configuration | `lib/persistence/boundary/`, `lib/persistence/nativeAccountPg.ts`, and Launchpad application/policy stores | **CONSOLIDATE** | Private tenant and policy administration may remain offchain. It must not become the verifier's source of cryptographic truth. |

## Legacy and duplicated paths

| Path | Classification | Evidence and required treatment |
|---|---|---|
| Launchpad harness receipt path | **REPLACE incrementally** | `lib/partner/launchpad/runTestScenario.ts` intentionally fails with `receipt_unavailable` unless sovereign transactional storage is active. Do not remove the guard until the real trust-execution/Solana path provides equivalent durability, replay, tenant, policy, and recovery guarantees. |
| Global Supabase/PostgREST persistence | **CONSOLIDATE** | It may continue serving legacy or non-authoritative product state, but must not silently satisfy sovereign trust execution or independent current-validity verification. Existing boundary tests enforce this separation. |
| Database-dependent Passport branch | **CONSOLIDATE** | The challenge and verify routes retain a higher-trust chain-neutral identity branch. Ordinary wallet-native sign-in is already independent and must remain so; higher-trust evidence must not be deleted merely because sign-in no longer needs it. |
| Process-local institutional challenge state | **REMOVE from durable execution only after caller proof** | Safe for bounded tests and ephemeral flows, unsafe for distributed atomic replay enforcement. Callers must use the durable store before a removal is attempted. |

## Ranked execution risk

1. **Protected devnet programs are not yet upgraded.** Merged behavior and deployed behavior differ until the authorized operator completes the reviewed migrations.
2. **Integration Studio's legacy harness cannot issue its durable receipt without the sovereign store.** The UI now reports this correctly; the guard must not be bypassed.
3. **Release environments were inconsistent.** The application required Node 24 while four SQL-parity CI jobs used Node 20 and local selectors were absent.
4. **Multiple persistence-era paths remain present.** Their removal requires caller-by-caller evidence so historical records, tenant isolation, and revocation are not lost.

## First consolidation change

The repository now defines one secret-free release toolchain contract:

- Node 24 for local selectors, `package.json`, and every GitHub Actions Node job.
- Rust 1.88.0 and Anchor 0.30.1 from the Solana workspace.
- Solana CLI/cargo-build-sbf 2.2.20 with SBF platform tools v1.53.
- A blocking `check:toolchain-contract` check before deterministic SBF compilation.

This removes a demonstrated clean-environment mismatch without changing runtime behavior, account layouts, persistence, UI, program identities, or deployment authority. CI continues to build and test artifacts without possessing signing secrets.

## Next executable boundary

After this toolchain contract passes review, the next product-facing consolidation is to adapt Integration Studio to the already implemented trust-execution and finalized Solana receipt path after the controlled devnet upgrade. The existing receipt-storage guard remains fail-closed until that path proves equivalent or stronger durability and replay guarantees.
