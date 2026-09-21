# Independent Solana devnet deployment-readiness audit

**Title:** Independent Solana devnet deployment-readiness audit  
**Scope:** First human-operated Abraxas Solana **devnet** eligibility gate  
**Method:** Separate read-only audit of the source tree and tests, then implementation remediations, then independent re-review. The implementation agent does not self-approve.  
**This document does not deploy, broadcast, configure RPCs, add keys, apply SQL, modify Vercel, or move funds.**

## Architecture reviewed

End-to-end path:

1. Private organization eligibility result (opaque commitments only)
2. Hosted Partner Flow + fresh consent
3. Audience-bound eligibility presentation
4. Mandatory current public receipt re-fetch
5. Receipt validity / revocation / holder withdrawal
6. V2 Solana canonical attestation (468-byte `ABRAXAS_CHAIN_ELIGIBILITY_V2`)
7. Chain-attestation signer lifecycle (distinct from receipt keys)
8. Verified onchain deployment record (`verified_sandbox`)
9. Partner-owned Solana gate (`authorize` / `consume`)
10. Expiry-bound protocol-access entitlement
11. Partner-owned named action decision

Primary code:

- `solana/abraxas-eligibility-gate/programs/abraxas-eligibility-gate/`
- `solana/abraxas-eligibility-gate/programs/abraxas-protocol-access/`
- `solana/abraxas-eligibility-gate/programs/abraxas-eligibility-consumer/`
- `solana/abraxas-eligibility-gate/integration-tests/`
- `lib/partner/chainAttestation/`
- `lib/partner/onchainGateDeployments/`
- `lib/partner/onchainVerifierConformance/`
- `lib/partner/testnetGateDeploymentKit/`
- `lib/partner/crossChainProtocolAccess/`
- `lib/eligibilityPresentation/`
- `contracts/evm-eligibility-verifier/` (cross-language vectors only)
- `supabase/migrations/101_chain_attestation_nonces.sql` through `106_private_organization_eligibility.sql` (listed, **not applied**)

## Exact commands run

Commands are recorded after execution in the PR iteration. Planned / executed local-only set:

```bash
git rev-parse HEAD
npx vitest run lib/partner/onchainVerifierConformance/onchainVerifierConformance.test.ts lib/partner/onchainGateDeployments/onchainGateDeployments.test.ts
npm run abraxas-conformance -- vectors
npm run check:homepage
npm run check:homepage-guard
npm run check:trust-contract-drift
rustup run 1.88.0 cargo test --manifest-path solana/abraxas-eligibility-gate/Cargo.toml --workspace -- --nocapture
# Foundry vectors (local, no broadcast)
forge test --root contracts/evm-eligibility-verifier
# Vercel-equivalent typecheck/build with CI placeholders only
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 \
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ci-placeholder \
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ci-placeholder \
npx tsc --noEmit
```

No live RPC, no `solana program deploy`, no `supabase db push`, no Vercel project mutation.

## Findings

### Critical

#### C-1 — Authorization subject not bound at protocol activate (remediated)

- **Evidence:** Prior `Authorization` omitted `subject_hash`. `activate_protocol_access` accepted caller-supplied `subject_hash` and wrote it onto `ProtocolEntitlement`.
- **Exploit path:** Authorize subject A. Activate with subject B and organization commitment from the same authorization. Entitlement PDA is keyed by B, so B inherits A’s consume.
- **Impact:** Cross-subject protocol access on a partner-owned gate.
- **Fix:** Persist `Authorization.subject_hash` in `authorize`; require `authorization.subject_hash == subject_hash` (`SubjectMismatch`). Regression: `activate_rejects_subject_swap` in `protocol_access.rs`.
- **Status:** Remediated in this PR. Independent re-review required.

#### C-2 — Conformance `ok` without chain observation (remediated)

- **Evidence:** `evaluateConformance` accepted self-consistent JSON. Institutional Solana trusted envelope `solana_v2` when observation was omitted.
- **Exploit path:** Produce a local report with `ok: true` and institutional V2 envelope fields without proving program/config posture.
- **Impact:** A report could be treated as deployment-ready / institutional-capable without chain proof.
- **Fix:** Institutional Solana requires a complete observation; missing observation → `deployment_not_verified`. Incomplete / V1-only observation → `institutional_required`. Reports remain `live: false`. CLI remains local file self-consistency except this fail-closed institutional path.
- **Status:** Remediated. Reports still must not be treated as live chain proof.

### High

#### H-1 — Incomplete Solana observation treated as not-V1-only (remediated)

- **Evidence:** `solanaObservationIsV1Only` used `=== false` / `=== 1` / `=== 372`. Missing fields were `undefined`, so the helper returned false. Live RPC adapter returned only keccak of raw account bytes.
- **Exploit path:** Institutional verify/register with a digest-only observation that omits capability fields.
- **Impact:** `verifySolanaAgainstChain` already required `solanaObservationHasV2InstitutionalCapability` when `institutionalRequired`, so register was fail-closed. Conformance and any caller of `isV1Only` alone were not.
- **Fix:** Missing capability fields are V1-only. RPC adapter explicitly marks `institutionalCapable: false` and V1 lengths. Incomplete observations fail institutional conformance.
- **Status:** Remediated.

#### H-2 — Institutional conformance trusts envelope without observation (remediated)

Covered by C-2 / H-1 remediations.

#### H-3 — Actor / category not checked at activate (remediated)

- **Evidence:** Activate checked organization commitment and subject (after C-1) but not actor/category zeros when `require_institutional`.
- **Exploit path:** Defense-in-depth only if an `Authorization` with zero actor/category were present under an institutional config. New `authorize` already rejects those zeros.
- **Fix:** Institutional activate requires non-zero actor, category, and organization on the stored authorization.
- **Status:** Remediated.

### Medium (accepted residual for first human-operated **devnet**)

| ID | Issue | Evidence | Residual risk |
|----|--------|----------|---------------|
| M-1 | `issued_at` is validated (`> 0` and `< expires_at`) but not stored on `Authorization` | `lib.rs` authorize | Clock-bound expiry still enforced; issued_at cannot be replay-checked later |
| M-2 | Zero `expected_*` commitments skip exact match | `lib.rs` 101–118 | Institutional still requires non-zero message commitments; operators must set expected bytes for a locked org/actor/category |
| M-3 | Nonce uniqueness is the attestation PDA, not a stored nonce set | `AUTH_SEED` + attestation_id | Duplicate attestation IDs fail `init`; distinct IDs can re-authorize |
| M-4 | V1 372-byte accepted when `require_institutional == false` | `parse_canonical_message_for_config` | Intended non-institutional compatibility; first institutional devnet must set `require_institutional` |
| M-5 | Live Solana RPC adapter cannot compute structured `expectedSolanaConfigDigest` | `adapters.ts` server adapter | Institutional register/verify fail-closed; operators must use a fixture or a future structured decoder, not raw keccak, before claiming V2 on-chain proof |
| M-6 | `ABRAXAS_ONCHAIN_DEPLOYMENT_TEST_ADAPTER` still bypasses store in local sandbox tests | `bindIssuance.ts` | Denied for `VERCEL`, `NODE_ENV=production`, and `kitEnvironment=production` |

### Low / Informational

| ID | Notes |
|----|--------|
| L-1 | Non-institutional `evaluateConformance` still allows omitted `receiptRefetched`. Institutional now requires `receiptRefetched === true`. |
| L-2 | Adding `Authorization.subject_hash` changes account layout. Acceptable because no human-operated Solana gate is registered yet. Redeploy if any unpublished ProgramTest artifacts exist. |
| L-3 | `npm run abraxas-conformance` is deterministic local self-consistency. `ok` is not a live deployment certificate. |
| I-1 | Toolchain pin: Rust 1.88.0, Solc 0.8.24 `via_ir = true`, Node `24.x`. |
| I-2 | Required migrations already in repo: `101`–`106` (nonces, deployments, signer lifecycle, Reclaim sessions, presentations, private org eligibility). **Not applied by this audit.** |
| I-3 | Deploy kit rejects CI, Vercel, missing `--confirm`, Mainnet, unpublished Arc. Verify/register fail-closed on V1-only institutional observation. |
| I-4 | Client issuance allowlist cannot select signer, schema, commitments, expiry, or policy as authority (`parseChainAttestationRequest`). |
| I-5 | Programs contain no SPL token, transfer, wallet-create, or arbitrary `invoke` CPI. Consume is a constrained CPI to the gate. |

## Adversarial coverage added

- Subject-swap activate ProgramTest
- V2 body + V1 prefix, appended bytes, zero `issued_at`
- Canonical length fuzz (0, 1, 16, 371, 373, 467, 469, 512, 1024)
- Ed25519 foreign instruction index rejected
- Institutional conformance without observation
- Incomplete observation treated as V1-only
- Production / Vercel test-adapter denial

Existing ProgramTest already covers V1-on-institutional, org/actor/category mismatch, expiry, replay consume, wrong signer, revoked signer, entitlement expiry, stale renewal, and no token/CPI strings.

## Deployment recommendation

**READY FOR HUMAN DEVNET DEPLOYMENT** after independent re-review confirms C-1 through H-3 remain closed.

This is **not** a Mainnet, Arc, Utila, payments, or execution authorization.

### Human-only inputs (do not paste secrets into tickets, git, Studio, or this PR)

An operator on a local workstation, not CI/Vercel/browser, must supply:

1. Solana **devnet** RPC URL (env only; never a manifest field)
2. Deployer keypair path (local file; never logged)
3. Distinct **chain-attestation** Ed25519 secret (not the receipt signing key)
4. Confirmation flag `--confirm` on deploy
5. Institutional expected organization / actor / category commitment bytes if the gate is institutional
6. Confirmation that migrations `101`–`106` are already applied in the **target** environment by a human (this PR does not apply them)
7. Registration only after local `verify` observes V2 (`schemaVersion=2`, `canonicalMessageLen=468`, `requireInstitutional=true`, `institutionalCapable=true`)

Never commit RPC URLs, key material, transaction payloads, or raw credentials.
