# Build #820 — External sovereign staging and independent verification acceptance

**Baseline:** PR **#819 merged** (`main`) · Production behavior unchanged  
**Scope:** Infrastructure and acceptance — **no new cryptographic protocol layer**

## 1. Infrastructure host and ownership (redacted template)

| Field | CI / contract drill | External attested (founder gate) |
|-------|---------------------|--------------------------------|
| Host | GitHub Actions `postgres:16-alpine` service | Operator sets `ABRAXAS_STAGING_HTTP_BASE_URL` |
| Ownership evidence | N/A — explicitly **not** external | Redacted: cloud account id, TLS cert CN, DB instance id |
| Attestation | **Pending** | `ABRAXAS_EXTERNAL_STAGING_DEPLOYMENT_ATTESTED=<founder-id>` |

Validate checklist: `npx tsx scripts/sovereign/validate-staging-ownership.ts`

## 2. Network and TLS isolation

- Sovereign Postgres must not be the Production Supabase project ref (`bztwutzprwsdrtqdpymf`).
- Staging class: `ABRAXAS_SOVEREIGN_ENV_CLASS=staging` (or `disposable` for drills only).
- Docker compose under `docker/sovereign-staging/` is **local equivalence**, not external attestation.

## 3. Staging issuer and trust-anchor provenance

Build #820 acceptance generates **synthetic sandbox-only** keys per run (not Production issuers):

- Receipt signing key (`build820-issuer`)
- Trust anchor (`build820-trust-anchor`)
- Status signer (`build820-status-signer`)

Pinned bundle: `buildTrustAnchorBundleV1` → standalone `@abraxas/independent-verifier`.

## 4. Published SIAS and signed status evidence

Orchestration: `lib/persistence/boundary/staging/threeLayerTrustAcceptance.ts`

- SIAS from registry via `publishSignedIssuerAuthorityFromRegistry`
- Status from sovereign evaluation via `publishSignedReceiptStatusFromSovereignEvaluation`
- Verifier: `verifyAbraxasReceiptIndependently` (no Supabase, PostgREST, or live Abraxas API)

## 5. Independent verifier PASS/FAIL results

| Scenario | Expected |
|----------|----------|
| Three-layer happy path | `currently_acceptable: yes` |
| Receipt revoked | `currently_acceptable: no` |
| Stale status replay (with `minimumStatusVersion`) | `status_version_rollback_rejected` |
| Wrong partner audience | `audience_mismatch` |
| Issuer key revoked in SIAS | authentic signature, **not** currently authorized |

## 6. Revocation and rollback evidence

Adverse scenarios above are automated in `runBuild820Acceptance`.  
**Documented limitation:** anti-rollback requires the verifier to retain or receive an authenticated `minimumStatusVersion`; a fresh verifier with only an older still-valid signed statement cannot infer a newer revocation offline.

## 7. Encrypted restoration and reconciliation

Uses `exportEncryptedSovereignSliceBackup` / `restoreEncryptedSovereignSliceBackup` and `reconcileSovereignSlice` on primary vs restore pools.  
Restore drill requires operator authorization env pair (see `SOVEREIGN_STAGING_DEPLOYMENT_CONTRACT.md`).

## 8. Measured recovery performance

Report fields: `recovery.rto_observed_ms`, `recovery.rpo_bound_ms` from `computeRecoveryMetrics`.  
CI disposable measurements are **indicative only**, not production SLA claims.

## 9. Remaining operational dependencies

- Abraxas-operated host + founder attestation for external tier
- Operator monitoring and audit pipelines (not bundled in this build)
- Production writer cutover and Supabase independence remain separate gates

## 10. Explicitly incomplete gates

Until founder attestation:

- `external_staging_attestation`
- `founder_attestation_required`
- `externally_witnessed_operation`

CI sets `ABRAXAS_BUILD_820_CI_CONTRACT=1` — passes contract drill **without** claiming external acceptance.

## 11. Focused PR and CI

- Integration: `lib/persistence/boundary/staging/threeLayerTrustAcceptance.integration.test.ts`
- Job: `sovereign-operational-proof` (Build #820 step added)
- Operator runner: `npm run sovereign:build-820-acceptance` (see env in contract doc)

## 12. Next Production readiness decision

**After** external staging attestation and green acceptance on that host:

1. Re-run acceptance with `execution_tier: external_attested`
2. Decide Production authority path cutover (still no automatic Production migration from this build)
3. Keep partner integrations on current Production until a separate cutover approval

**Do not** represent synthetic staging issuance as genuine holder acceptance or Production readiness.
