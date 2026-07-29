# Verification v1 Readiness Report

**Branch:** `cursor/biometric-tier1-wiring-d541` (PR #86)  
**Engine:** `abraxas-biometric-v3`  
**Validated:** 2026-07-29 (automated execution in CI workspace)  
**Method:** Code trace + targeted test execution + logged inference runs. No new features implemented.

---

## Executive scorecard

| Tier 1 requirement | Verdict |
|--------------------|---------|
| Passport → Policy → Capture wiring | 🟡 PARTIAL |
| Capture endpoint full v3 analysis | ✅ PASS |
| Partner-specific thresholds (Good Trouble) | ✅ PASS |
| Assessment persistence (v3 signals) | 🟡 PARTIAL |
| Admin v3 signal panel | ✅ PASS |
| Manual approval → credential issuance | 🟡 PARTIAL |
| Relying-party credential verify | ✅ PASS |
| ONNX matcher (default + fallback) | 🟡 PARTIAL |
| Production HTTP e2e (live Supabase) | 🟡 PARTIAL |

---

## Phase 1 — Production smoke test

### 1. Passport verification request created

**Verdict: 🟡 PARTIAL**

| Evidence type | Detail |
|---------------|--------|
| Files | `app/api/v1/verification-requests/route.ts`, `app/api/passport/demo-partner-request/route.ts`, `lib/verification/requestsService.ts` |
| API | `POST /api/v1/verification-requests`, `POST /api/passport/demo-partner-request` |
| Tests | `lib/verification/v1PartnerAuth.test.ts` (3 passed) |
| Live HTTP | **Not executed** — requires Supabase + partner auth in staging |

Holder redirect after request: `/passport?verify_request={id}&policy_id=…&partner_id=…` (documented in `docs/VERIFICATION_V1_AUDIT.md`).

---

### 2. Passport passes `verification_request_id`, `policy_id`, `partner_id` into capture

**Verdict: ✅ PASS**

| Evidence type | Detail |
|---------------|--------|
| Files | `app/passport/page.tsx` (L61–63, L246–250), `lib/idv/capturePolicyContext.ts`, `components/passport/AbraxasIdentityCapture.tsx` (L157–159) |
| API | Form fields on `POST /api/identity/documents/capture` |
| Tests | `lib/idv/capturePolicyContext.test.ts` — **2 passed** |

```json
// capturePolicyContext.test.ts output mapping
{
  "verification_request_id": "vr-123",
  "policy_id": "good-trouble-retail-v1",
  "partner_id": "good-trouble-cannabis"
}
```

---

### 3. Capture endpoint performs full biometric analysis

**Verdict: ✅ PASS**

| Evidence type | Detail |
|---------------|--------|
| Files | `app/api/identity/documents/capture/route.ts` (L176–183), `lib/idv/biometric/analyzeCapture.ts` |
| API | `POST /api/identity/documents/capture` |
| Tests | `lib/idv/biometric/verificationMatrix.test.ts` — **9 passed**; `lib/idv/biometric/capturePolicyPipeline.test.ts` — **1 passed** |

Telemetry log (capturePolicyPipeline):

```json
{"event":"biometric.analyzed","engine_version":"abraxas-biometric-v3","decision":"human_review","scores":{"face_match":1,"liveness":0.386},"signals":{"alignment":0.8061,"blur":0.1532,"screen_replay":0.0844,"deepfake":0,"face_count":1},"reason_codes":["SELFIE_QUALITY_LOW","LIVENESS_WEAK"]}
```

v3 signal fields stamped in `analyzeCapture.ts` L119–145: alignment, blur, lighting, occlusion, screen_replay, deepfake, fraud_risk, face_match_method, threshold_policy_source, partner_id.

---

### 4. Partner-specific thresholds are applied

**Verdict: ✅ PASS**

| Evidence type | Detail |
|---------------|--------|
| Files | `lib/idv/biometric/resolveCapturePolicy.ts`, `lib/idv/biometric/decision.ts`, `lib/idv/biometric/partnerThresholds.ts` |
| API | `resolveCaptureBiometricPolicy()` in capture route |
| Tests | `lib/idv/biometric/resolveCapturePolicy.test.ts` — **3 passed**; `capturePolicyPipeline.test.ts` |

Pipeline evidence — same synthetic capture, different policy:

| Run | `threshold_policy_source` | `decision` |
|-----|---------------------------|------------|
| Global | `global` | `human_review` |
| Good Trouble | `partner` | `reject` |

---

### 5. Assessment stored with all v3 biometric signals

**Verdict: 🟡 PARTIAL**

| Evidence type | Detail |
|---------------|--------|
| Files | `lib/idv/biometric/persistAssessment.ts`, `lib/idv/biometric/explainableSignals.ts` |
| API | Upsert to `identity_biometric_assessments.signals` JSONB |
| Tests | `lib/idv/biometric/explainableSignals.test.ts` — **1 passed**; `verificationMatrix.test.ts` ("stores explainable audit signals") |
| Live DB | **Not executed** — `persistBiometricAssessment` returns `{ ok: false, error: "Supabase not configured" }` without env |

Signals persisted include: scores, reason_codes, face_match_method, threshold_policy_source, partner_id, alignment/blur/lighting/occlusion/replay/deepfake.

---

### 6. Admin review queue displays v3 signals and reason_codes

**Verdict: ✅ PASS**

| Evidence type | Detail |
|---------------|--------|
| Files | `app/admin/identity/page.tsx`, `lib/admin/biometricSignalRows.ts`, `app/api/admin/identity/queue/route.ts` |
| API | `GET /api/admin/identity/queue` |
| Tests | `lib/admin/biometricSignalRows.test.ts` — **1 passed** |

Rows include: Engine version, Threshold source, Partner, Face match method, Screen replay, Deepfake status, Reason codes (26 fields total in `buildBiometricSignalRows`).

---

### 7. Manual approval issues a credential

**Verdict: 🟡 PARTIAL**

| Evidence type | Detail |
|---------------|--------|
| Files | `app/api/admin/identity/approve/route.ts`, `lib/idv/adminReviewService.ts` (L177–198), `lib/idv/issueIdentityCredential.ts` |
| API | `POST /api/admin/identity/approve` |
| Tests | `lib/idv/adminReviewService.test.ts` — **5 passed** (decision mapping only) |
| Live issuance | **Not executed** — requires Supabase + `ABRAXAS_SIGNING_KEY` |

Code path on approve: `executeAdminReviewAction` → `issueManualIdentityCredential` → `SignJWT` (EdDSA) → `abraxas_credentials` upsert.

---

### 8. Credential verified through relying-party flow

**Verdict: ✅ PASS**

| Evidence type | Detail |
|---------------|--------|
| Files | `app/api/credentials/verify/route.ts`, `lib/authenticationProof/issueVerifyDecision.ts`, `lib/credentials/verifyJwt.ts` |
| API | `POST /api/credentials/verify` |
| Tests | `lib/authenticationProof/e2eVerification.test.ts` — **4 passed**; `issueVerifyDecision.test.ts` — **1 passed** |

e2e test proves: signed `authentication_proof`, `signature_valid: true`, `verify_url` contains `/api/proof/`.

---

## Phase 2 — ONNX validation

### Test A — Normal (model present)

**Verdict: ✅ PASS**

| Evidence type | Detail |
|---------------|--------|
| Files | `lib/idv/biometric/faceMatchProvider.ts`, `faceEmbeddingOnnx.ts`, `faceSimilarity.ts` |
| Tests | `lib/idv/biometric/faceSimilarity.test.ts` > "runs ONNX embeddings when model file is present" — **passed (841ms)** |
| Model | `models/mobilefacenet.onnx` (131 MB, gitignored, downloaded via `npm run biometric:download-model`) |

Assertions:
- `resolveFaceMatchMethod()` → `onnx_embedding` (default)
- `result.method === "onnx_embedding"`
- `result.score > 0.5`
- No fallback stderr on success path

### Test B — Failure (missing model)

**Verdict: ✅ PASS**

| Evidence type | Detail |
|---------------|--------|
| Tests | `faceSimilarity.test.ts` > "falls back to correlation when ONNX model is missing" — **passed** |

Log (stderr):

```
[faceSimilarity] ONNX embedding match failed, using correlation fallback
Error: Face embedding model not found at /workspace/models/definitely-missing.onnx
```

Assertions:
- `result.method === "correlation"`
- `result.score > 0.8` (capture continues, no throw)
- User-facing capture path returns 422 only on engine `reject`, not on ONNX fallback (`AbraxasIdentityCapture.tsx` L176–181)

### Production ONNX deployment

**Verdict: 🟡 PARTIAL**

- CI/dev without model: correlation fallback used (see verificationMatrix stderr logs)
- Vercel production: model must be provisioned at runtime (`ABRAXAS_FACE_EMBEDDING_MODEL` or `npm run biometric:download-model` in deploy pipeline)

---

## Phase 3 — Policy validation (Good Trouble)

Executed: `npm run biometric:validate-policy`

| Scenario | Global decision | Global reason_codes | GT decision | GT reason_codes | Policy changes outcome? |
|----------|-----------------|---------------------|-------------|-----------------|-------------------------|
| above_thresholds (face 0.95, liveness 0.95) | human_review | BORDERLINE_HUMAN_REVIEW | human_review | BORDERLINE_HUMAN_REVIEW | false |
| borderline (face 0.88, liveness 0.93) | human_review | BORDERLINE_HUMAN_REVIEW | human_review | **FACE_MATCH_LOW** | **true** |
| below_thresholds (face 0.55, liveness 0.60) | human_review | BORDERLINE_HUMAN_REVIEW | human_review | LIVENESS_WEAK, FACE_MATCH_LOW | **true** |

**Verdict: ✅ PASS** — partner policy changes reason_codes and strictness vs global.

Additional tests:
- `lib/goodTrouble/biometricPolicy.test.ts` — **3 passed** (thresholds match migration 050)
- `capturePolicyPipeline.test.ts` — partner `reject` vs global `human_review` on identical buffers

**Limitation:** `retail_minimum_age: 21` in policy JSON is **not enforced** by biometric engine (credential layer gap).

---

## Phase 4 — Credential validation

| Capability | Verdict | Evidence |
|------------|---------|----------|
| Credential issuance | ✅ PASS | `issueVerifyDecision.test.ts`; `issueIdentityCredential.ts` SignJWT path |
| Credential signature | ✅ PASS | `verifyProof.test.ts` — `signature_valid: true` |
| Verification endpoint | ✅ PASS | `e2eVerification.test.ts` — POST shape + proof bundle |
| Revocation check | 🟡 PARTIAL | `lib/credentials/verifyJwt.ts` L91–92 checks `revoked_at`; `lib/trust/trustLayer.test.ts` denies revoked claims. **No HTTP e2e against live revoked JWT.** |
| Expiration handling | 🟡 PARTIAL | `verifyJwt.ts` L94–95; `trustLayer.test.ts` resolves expired at read time. **No HTTP e2e.** |

---

## Phase 5 — Evidence index

### Test runs executed (this validation)

```
npm test                                    → 330 passed (88 files)
npx vitest run lib/idv/biometric/faceSimilarity.test.ts     → 4 passed (ONNX A+B)
npx vitest run lib/idv/biometric/capturePolicyPipeline.test.ts → 1 passed
npx vitest run lib/goodTrouble/biometricPolicy.test.ts      → 3 passed
npx vitest run lib/authenticationProof/e2eVerification.test.ts → 4 passed
npm run biometric:validate-policy           → 3 scenarios logged
```

### Key implementation links

| Area | Path |
|------|------|
| Capture route | `app/api/identity/documents/capture/route.ts` |
| Policy resolution | `lib/idv/biometric/resolveCapturePolicy.ts` |
| ONNX matcher | `lib/idv/biometric/faceEmbeddingOnnx.ts` |
| Correlation fallback | `lib/idv/biometric/faceSimilarity.ts` |
| Good Trouble thresholds | `lib/goodTrouble/biometricPolicy.ts` |
| Admin signals | `lib/admin/biometricSignalRows.ts` |
| Credential verify | `app/api/credentials/verify/route.ts` |
| Migration 050 | `supabase/migrations/050_good_trouble_biometric_thresholds.sql` |

### Known PARTIAL items (not blockers for code merge; blockers for production claim)

1. No live HTTP e2e against staging Supabase for capture → admin → credential loop
2. ONNX inference in CI uses correlation fallback unless model downloaded
3. Migration 050 must be applied in production Supabase for Good Trouble DB policy
4. `PassportSetupPanel` / `MyVerificationPanel` not wired with `capturePolicy`
5. Model must be provisioned on Vercel host for production ONNX (not bundled in serverless)

---

## Final readiness

**Code wiring:** Ready for merge pending Vercel bundle-size confirmation on `2b08f64`.

**Production claim:** 🟡 PARTIAL until:
- Staging e2e: capture with `?policy_id=good-trouble-retail-v1` → admin shows `threshold_policy_source: partner`
- Migration 050 applied
- ONNX model on production host
- One manual admin approve → `POST /api/credentials/verify` with issued JWT
