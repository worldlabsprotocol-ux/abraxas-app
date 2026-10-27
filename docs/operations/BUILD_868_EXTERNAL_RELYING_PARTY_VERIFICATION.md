# Build #868 — External relying party verification

## Institutional milestone levels

| Level | Meaning | Status |
| --- | --- | --- |
| One genuine, currently acceptable receipt | Single Demo wallet-control issuance + portable verify | **Passed** (Build 864) |
| Two isolated application executions | Distinct `application_id`, credentials, audience isolation on Demo | **Passed** (Build 866 / PR #867) |
| Verification by an external relying party | Isolated process, pinned trust, no hosted `/verify` decision | **Build 868** |

Build 866 proves **application-level repeatability**, not independent organizational tenancy. Integration Studio may reuse the same `partner_id` and `wallet_control` policy pack across applications; isolation is enforced by application credentials, receipt audience binding, and cross-application handoff rejection.

## Phase 1 — PR reconciliation and Demo SHA

| PR | Scope |
| --- | --- |
| #866 | Mobile homepage corrections (separate from institutional path) |
| #867 | Institutional partner repeatability (Build 866) |

After merge, record:

- **`main` commit** at acceptance time (agent records `git rev-parse HEAD`).
- **Demo deployment** from `GET /api/launchpad/staging/environment` on `https://demo.abraxasworld.xyz` — do **not** assume Demo auto-promotes when `main` moves.

Required env for Demo runners:

```bash
export LAUNCHPAD_STAGING_URL=https://demo.abraxasworld.xyz
export LAUNCHPAD_EXPECTED_SUPABASE_REF=ocntwbxarpjeixdnzide
# Optional when deployment protection is on:
# export VERCEL_PROTECTION_BYPASS=...
```

## Phase 2–5 — External verification boundary

Orchestrator: `npm run build868:demo-external-relying-party-verification`

External verifier (separate process, no `@/lib` imports):

```bash
export RP_PARTNER_ID=<partner_id>
export RP_POLICY_ID=<policy_id>
export RP_ENVIRONMENT=demo
export RP_TRUST_ANCHOR_PATH=examples/portable-relying-party/trust-config.demo.template.json
npx tsx examples/portable-relying-party/verifyPortableReceiptFromFile.ts /path/to/portable-bundle.json
```

The relying party consumes:

| Input | Source |
| --- | --- |
| Portable receipt bundle | Persisted JSON (orchestrator may fetch once from `GET /api/receipts/{id}/portable-verification`) |
| Pinned trust anchor | Out-of-band file (`RP_TRUST_ANCHOR_PATH`) |
| Issuer authority evidence | Inside bundle (`signed_issuer_authority`) |
| Signed status / revocation evidence | Inside bundle (`signed_status_statement`) |
| Crypto parameters | `@abraxas/independent-verifier` contract |

**Excluded from the verification decision:** Integration Studio state, Demo DB credentials, partner API keys in the verifier process, Abraxas hosted `/verify`.

Network fetch of the portable bundle is **distribution**, not delegating accept/reject to Abraxas.

### Trust fact provenance

| Property | From bundle alone | Requires fresh observation |
| --- | --- | --- |
| Cryptographic authenticity | Receipt + bundled statements | — |
| Authorized issuer | Signed issuer authority + pin | Statement freshness at `statementObservedAt` |
| Policy and audience | Receipt payload + `RP_*` scope | — |
| Authentic status evidence | Signed status in bundle | Status max-age at verify time |
| Current acceptability | — | Authentic signed status required (not signature alone) |

## Phase 4 — Adversarial matrix

Implemented in `scripts/build-868/externalRpAdversarial.ts` (same verifier package). Rejects tampered payload, wrong audience, wrong policy, substituted anchor pin, expired/revoked status, stale observation, missing signed status, and corrupted issuer authority statement.

## Phase 6 — Regression (CI)

For changes touching receipt issuance, dependency persistence, migrations, or operational validity:

```bash
npm run test:build-865-evidence-continuity
npm run test:build-868-portable-relying-party
```

## Reuse existing receipts (optional)

```bash
export BUILD868_USE_EXISTING_RECEIPTS=1
export BUILD868_RECEIPT_A=dr_...
export BUILD868_PARTNER_A_ID=...
export BUILD868_POLICY_A_ID=...
export BUILD868_RECEIPT_B=dr_...
export BUILD868_PARTNER_B_ID=...
export BUILD868_POLICY_B_ID=...
npm run build868:demo-external-relying-party-verification
```

Artifact: `/opt/cursor/artifacts/build-868/demo-external-relying-party-verification.json`

## Completion criterion

Two independently issued, policy-bound receipts are verified to **`permit`** by an external subprocess using `@abraxas/independent-verifier` and a pinned Demo trust anchor, with adversarial cases failing closed. No new trust roots, protocols, or hosted verification delegation.
