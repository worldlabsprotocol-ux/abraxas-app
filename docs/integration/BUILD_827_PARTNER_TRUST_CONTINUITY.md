# Build #827 — Partner trust continuity

## Baseline

- **#826 merged** at `f1d24f5b` — standalone portable enforcement, `examples/portable-relying-party/`.
- Live Demo acceptance for `dr_jSXuDfM_pFMT36du` remains valid; **not re-run** in this build.

## 1. Existing safeguards reused

| Safeguard | Location |
|-----------|----------|
| Bundled anchor informational only | `assertBundledAnchorMatchesIntegratorPin`, portable export provenance |
| `minimumStatusVersion` / `minimumRegistryVersion` anti-rollback | `@abraxas/independent-verifier` |
| Permit / deny / indeterminate classification | `classifyStandalonePortableVerification` (#826) |
| Issuer-side status checkpoints | `statusVersionCheckpoint.ts` (issuer ops — distinct from partner floors) |
| Signed SIAS + signed receipt status | Independent verifier phases |
| Callback never authorizes | Partner Kit contract |

## 2. Weaknesses addressed

- Integrators could not model **anchor rotation overlap**, **distrust**, or **audit** without ad-hoc pins.
- **Process restart** dropped partner minimum status/registry floors unless reimplemented per app.
- **Untrusted anchor in bundle** needed explicit registry rejection (not only pin mismatch).
- Checkpoint **corruption** had no documented fail-closed path.

## 3. Minimal implementation

- `IntegratorTrustAnchorRegistryV1` + `applyAuthorizedAnchorRotation` (operator ticket or prior-anchor signature).
- `resolveTrustedAnchorForBundledExport` — never installs anchors from downloads.
- `PartnerStatusCheckpointStore` — in-memory + file persistence interface.
- `enforcePortableVerificationWithTrustContinuity` — registry/pin → read floors → verify → commit on authentic status only.
- `AbraxasPartnerKit.enforcePortableVerificationWithTrustContinuity` + env loaders for registry JSON.
- Standalone example: `verifyWithContinuity.ts` + `partnerCheckpointFile.ts`.

## 4. Anchor rotation security

- **Operator path:** `integrator_operator` approval with `supersedes_fingerprint` matching active anchor.
- **Cryptographic path:** prior active anchor Ed25519 signature over `hashAnchorRotationAuthorization`.
- **Rejected:** wrong signer, distrusted new fingerprint, bundle-only anchor substitution, overlap after distrust.

Evidence: `lib/partner/integrationKit/trustContinuity/trustContinuity.adversarial.test.ts`.

## 5. Checkpoint persistence

- Scoped by `environment|partner_id|receipt_id`.
- Separate **status_version** and **registry_version** floors.
- Commit only after `status_evidence_authentic`; stale replay → `status_version_rollback_rejected`.
- File store: atomic rename write; `healthCheck()` → fail closed on corruption.

## 6. Adversarial tests

```bash
npm run test:build-827-partner-trust-continuity
```

Covers: untrusted substitution, overlap rotation, compromised signer, distrust, in-memory + file checkpoints, stale status vs ahead checkpoint, portable enforcement path.

## 7. Integration complexity

| Path | Steps | Dependencies |
|------|-------|----------------|
| Partner Kit + continuity | Pin or registry env + optional checkpoint file path | Existing kit, no new services |
| Standalone portable + continuity | Same as #826 + `RP_CHECKPOINT_PATH` | Node 20+, `@abraxas/independent-verifier`, local JSON file |

Recommended Partner Kit flow:

1. `loadIntegratorTrustRegistryFromEnv()` or single pin.
2. Callback → `receipt_id` only as handle.
3. `fetchPortableVerificationBundle(receiptId)`.
4. `enforcePortableVerificationWithTrustContinuity({ receiptId })` or pass bundle.
5. Inspect `action`, `failure_codes`, `next_actions`, `checkpoint`.

Standalone seven-step script:

```bash
npm run test:build-827-partner-trust-continuity
npx tsx examples/portable-relying-party/verifyWithContinuity.ts <receipt_id>
```

## 8. Safe enforcement (unchanged semantics)

- Expired / revoked / audience mismatch → **deny** when cryptographically determined.
- Fetch / export unavailable → **indeterminate** with retry guidance.
- Untrusted anchor / checkpoint corruption / stale status replay → **no permit**.

## 9. External institutional adoption still requires

- Design partner running **their** checkpoint store (Postgres/KV) implementing `PartnerStatusCheckpointStore`.
- Out-of-band trust anchor distribution and rotation runbook (Production keys unchanged in this build).
- Production portable export signing env on Abraxas deployment.
- Partner allowlisting and policy binding.
- Operational agreement on checkpoint backup / recovery (no silent reset to zero).

## Scope exclusions (honored)

No Production DB migrations, Production key rotation, new paid infra, Supabase expansion, or repeated live Demo wallet runs.
