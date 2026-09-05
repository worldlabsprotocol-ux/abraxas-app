# PR #257 Release Gate Evidence

## 1. Migration 078 backward compatibility

**Status: PASS (degraded-safe)**

- `age_evidence_records` is an audit ledger only — credential issuance does not depend on it.
- `createAgeEvidenceRecord()` checks table availability via `checkAgeEvidenceStorageAvailability()`.
- Missing table returns `{ ok: false, storage_unavailable: true, error: "age_evidence_storage_unavailable" }`.
- Admin approve and capture auto-approve continue when ledger insert is unavailable **in sandbox policies only**.
- Production/non-sandbox approvals fail closed when storage is unavailable.
- Tests: `lib/assurance/evidenceStorage.test.ts`, `lib/assurance/ageEvidence.test.ts`, `lib/assurance/ageEvidenceLinkage.test.ts`

## 1b. Age evidence ledger tightening

| Context | Behavior |
|---------|----------|
| Sandbox (`sandbox_only: true`) | Logs `storage_unavailable_sandbox_continue`; issuance continues |
| Production (`sandbox_only: false`) | Precheck returns 503 before issuance |
| Post-issuance production | `finalizeAgeEvidenceLinkage` fails closed if insert fails |


## Migration 078 deployment order (operator — do not auto-apply)

Apply **before** enabling production age-evidence linkage enforcement:

1. `supabase/migrations/078_age_evidence_records.sql` on staging Supabase
2. Verify: `SELECT to_regclass('public.age_evidence_records');`
3. Deploy application revision `87d2a842` or later
4. Production: repeat step 1 on production Supabase, then promote app

**Backward compatibility:** Pre-migration app revisions continue issuing credentials; sandbox logs `storage_unavailable` audit warnings. Production approvals fail closed until migration 078 exists.

**Staging instance:** `bztwutzprwsdrtqdpymf` (worldlabsprotocol-ux's Project) — `age_evidence_records` **not yet present** as of release gate.

**Parity script:** `bash scripts/ci/run-migration-078-sql-parity.sh` (requires `MIGRATION_078_PG_URL`)


## 2. resolveEffectivePolicyRules audit

**Status: PASS**

| Guard | Implementation |
|-------|----------------|
| Sandbox-only overlay | Requires `sandbox_only === true` on stored rules |
| Single-policy allowlist | `SANDBOX_POLICY_OVERLAY_ALLOWLIST` = `{ good-trouble-retail-v1 }` |
| No production overlay | `sandbox_only: false` → stored rules only |
| Published registry canonical | `policyExplicitlyRequiresProductEligibility(stored)` → no overlay |
| Does not replace operator publish | Overlay uses pending v2 constants until DB publish |

Tests: `lib/policy/resolveEffectivePolicyRules.test.ts`, `lib/assurance/crossIndustryCompliance.test.ts`

## 3–6. Journey verification

| Flow | Verification method |
|------|-------------------|
| Wix popup contract | **103/103** tests in `examples/good-trouble-wix/` |
| First visit E2E | `goodTroubleRetailWiring.integration.test.ts`, `ageLifecycle.test.ts` |
| Repeat visit | `goodTroubleRepeatVisit.integration.test.ts` — fresh receipt, no re-collection |
| Pending/denied never unlock GT | `crossIndustryCompliance.test.ts`; Wix `pilotTrustBoundary.test.js` |

Wix callback: `status=approved` alone not authoritative.

### Manual authenticated E2E

**Status: BLOCKED in agent environment** — no dedicated test identity in staging `sui_zklogin_identities`; Google OAuth cannot be automated headlessly. Staging Supabase: `bztwutzprwsdrtqdpymf` (shared with Vercel preview). **No production identities modified.**

Operator manual script: sign in on Vercel preview → `/partner/continue` with GT params → capture + DOB → admin approve → receipt callback.

## 7. Screenshots

Holder states use production copy/layout via `/partner/release-gate-preview` (preview-only gate).

| State | Desktop | Mobile |
|-------|---------|--------|
| Under review | `holder_under_review_desktop.png` | `holder_under_review_mobile.png` |
| Age confirmed | `holder_age_confirmed_desktop.png` | `holder_age_confirmed_mobile.png` |
| Return to Good Trouble | `holder_return_to_good_trouble_desktop.png` | `holder_return_to_good_trouble_mobile.png` |

Captured locally from production components (`PartnerJourneyLayout` + `partnerHolderCopy`). Vercel preview deployment is behind Vercel SSO; authenticated Google sign-in E2E remains operator-only.

See walkthrough artifacts for verify-age and admin review (desktop + mobile).

## 8. Preview data isolation

Vercel preview deployments use project-configured environment variables. Preview connects to the **same Supabase project** as configured in Vercel (typically staging/shared — not isolated per preview). **No production identity approvals were performed during this gate.** All journey verification used unit tests and read-only preview page loads.

## 9. Check suite (final blockers — local re-run)

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | **PASS** |
| Wix popup suite (`examples/good-trouble-wix/`) | **103/103 PASS** |
| Age evidence linkage tests | **5/5 PASS** |
| Repeat visit integration | **3/3 PASS** |
| Migration 078 SQL parity (unit) | **3/3 PASS** |
| `npm run check:homepage-guard` | **PASS** |
| `npm run check:homepage` | **PASS** |
| `npm run check:trust-contract-drift` | **PASS** (no findings on changed files) |
| `git diff --check` | **PASS** |
| Full vitest (`npm test`) | **2640 passed**, 9 failed (6 files) — **2 fewer failures than `main`** (11 failed) |
| `npm run build` (CI placeholder env) | **PASS** on GitHub Actions; local requires same env vars as CI |
| Audit-hash SQL parity | **PASS** on CI (postgres service) |
| Migration 076 SQL parity | **PASS** on CI |
| Migration 078 SQL parity (live postgres) | Requires `MIGRATION_078_PG_URL`; CI job not yet wired — unit parity tests pass |

### Wix popup failures fixed (were 2)

1. **`Wix deployment contract > awaits Wix enable/disable without enable-then-disable`** — test expected single-line `setButtonEnabled` signature; popup uses multiline formatting. Fixed test regex.
2. **`Wix deployment contract > initializes only in browser render environment with a single handler set`** — popup lacked `wixWindow.rendering.env !== "browser"` guard. Added guard to `AgeVerificationPopup.js`; updated test regex.

### Full-suite failures (pre-existing on `main`, not introduced by PR #257)

| File | Failures | Release impact |
|------|----------|----------------|
| `lib/wayfinding/partnerApplicationBatch1.test.ts` | 1 | Integrations page copy — unrelated to age lifecycle |
| `lib/admin/adminReceiptsPage.test.ts` | 2 | Admin receipts UI — unrelated |
| `lib/home/publicMetrics.test.ts` | 3 | Homepage metrics copy — unrelated |
| `lib/integrationReadiness.test.ts` | 1 | Integration readiness manifest — unrelated |
| `lib/integrate/partnerJourney.test.ts` | 1 | Partner journey wayfinding — unrelated |
| `lib/nav/navSignInButtonState.test.ts` | 1 | Nav sign-in button — unrelated |

None touch `ageEvidenceLinkage`, Wix popup, migration 078, or partner continue flows.

## Cross-industry compliance

See `docs/CROSS_INDUSTRY_COMPLIANCE_ARCHITECTURE.md` and `lib/assurance/crossIndustryCompliance.test.ts` (13 tests).
