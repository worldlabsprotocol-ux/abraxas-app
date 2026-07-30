# Abraxas Verification v1 — Evidence Audit

**Engine:** `abraxas-biometric-v3` (PR #84 merged to `main`)  
**Wiring:** PR #86 `cursor/biometric-tier1-wiring-d541`  
**Last verified:** tests on wiring branch (see CI after merge)

This document labels each Tier 1 item **COMPLETE** or **PARTIAL** based on code + automated tests, not README claims.

---

## Tier 1 scorecard

| # | Item | Verdict | Blocker to merge? |
|---|------|---------|-------------------|
| 0 | v3 engine (PR #84) | **COMPLETE** on `main` | No |
| 1 | Passport → Policy → Capture | **COMPLETE** wiring / **PARTIAL** e2e | No — merge; verify in staging |
| 2 | Admin v3 signal panel | **COMPLETE** | No |
| 3 | Good Trouble policy seeds | **COMPLETE** code / **PARTIAL** prod migration | Run migration 050 |
| 4 | ONNX face matcher | **PARTIAL** | Accept with correlation fallback until model on host |
| 5 | This audit | **COMPLETE** (evidence-based) | N/A |

---

## 1. Passport → Policy → Capture

**Verdict: COMPLETE (wiring) / PARTIAL (full e2e)**

### Files (PR #86)
- `lib/idv/capturePolicyContext.ts`
- `lib/idv/capturePolicyContext.test.ts`
- `lib/idv/biometric/resolveCapturePolicy.ts` (on `main`, tested in #86)
- `lib/idv/biometric/resolveCapturePolicy.test.ts`
- `lib/idv/biometric/capturePolicyPipeline.test.ts`
- `app/passport/page.tsx`
- `components/passport/PassportDashboard.tsx`
- `components/passport/AbraxasIdentityCapture.tsx`
- `app/api/identity/documents/capture/route.ts` (on `main`)
- `lib/idv/biometric/analyzeCapture.ts`

### Execution path
```
/passport?verify_request=&policy_id=&partner_id=
  → capturePolicy prop
  → capturePolicyFormFields() → FormData
  → POST /api/identity/documents/capture
  → resolveCaptureBiometricPolicy()
  → analyzeBiometricCapture({ policyRules })
  → evaluateBiometricDecision(..., { policyRules })
  → identity_biometric_assessments.signals
```

### Tests
- `capturePolicyContext.test.ts` — FormData field mapping
- `resolveCapturePolicy.test.ts` — DB policy resolution (mocked)
- `capturePolicyPipeline.test.ts` — `threshold_policy_source: partner` on real analyze path

### Limitations
- No HTTP integration test against live Supabase
- `PassportSetupPanel` / `MyVerificationPanel` capture paths not wired

---

## 2. Admin v3 signal panel

**Verdict: COMPLETE**

### Files
- `app/admin/identity/page.tsx` — `BiometricSignalsPanel`
- `lib/admin/biometricSignalRows.ts` — pure row builder (testable)
- `lib/admin/biometricSignalRows.test.ts`
- `app/api/admin/identity/queue/route.ts` — returns `signals` JSONB

### Tests
- `biometricSignalRows.test.ts` — blur, lighting, replay, reason_codes, threshold source

### Limitations
- No Playwright/screenshot test

---

## 3. Good Trouble policy

**Verdict: COMPLETE (code) / PARTIAL (production)**

### Files
- `supabase/migrations/050_good_trouble_biometric_thresholds.sql`
- `lib/goodTrouble/biometricPolicy.ts`
- `lib/goodTrouble/biometricPolicy.test.ts`
- `lib/idv/biometric/partnerThresholds.ts`
- `lib/idv/biometric/decision.ts`

### Tests
- Constants match migration
- Borderline capture: global passes, Good Trouble emits `FACE_MATCH_LOW`

### Limitations
- Migration not run until applied in Supabase
- `retail_minimum_age: 21` stored in policy JSON; not enforced by biometric engine (credential layer)

---

## 4. ONNX face matcher

**Verdict: PARTIAL**

### Files
- `lib/idv/biometric/faceEmbeddingOnnx.ts`
- `lib/idv/biometric/faceSimilarity.ts`
- `lib/idv/biometric/faceSimilarityCorrelation.ts`
- `lib/idv/biometric/faceMatchProvider.ts`
- `lib/idv/biometric/faceSimilarity.test.ts`
- `scripts/download-face-embedding-model.sh`

### Model
- ArcFace ONNX (`arcface.onnx` → `models/mobilefacenet.onnx`), **not in git** (~131 MB)

### Tests
- Correlation provider
- Fallback when model missing
- ONNX path runs **only if** model file exists locally (skipped in CI without model)

### Limitations
- No production benchmark vs correlation in CI
- Vercel deploy without model download → silent correlation fallback
- Cosine→score mapping is heuristic, not calibrated on production data

---

## 5. Would the code alone prove Verification v1 works?

**No.**

The code proves: engine runs, policy rules merge at decision time, signals persist, admin can display them.

It does not prove: ONNX in production, migration applied, partner-initiated verification request flow without manual URL params, credential issuance with age 21+.

---

## Freeze line

After PR #86 merges and migration 050 runs: **freeze biometrics**. Next: credential lifecycle, receipts, SDK, Good Trouble integration.
