# Abraxas Verification v1 — Final Audit

**Date:** 2026-07-29  
**Engine:** `abraxas-biometric-v3`  
**Verdict:** Tier 1 biometric wiring is **complete**. Biometric engine is **frozen** for v1 — only production bugfixes from here.

---

## Executive summary

| Layer | Status | Notes |
|-------|--------|-------|
| v3 biometric engine | **Done** | PR #84 merged |
| Passport → Policy → Capture → Decision | **Done** | `verification_request_id`, `policy_id`, `partner_id` on capture |
| Admin v3 signal panel | **Done** | All v3 signals + `reason_codes` + threshold source |
| Partner policy seeds | **Done** | Good Trouble retail (`050_good_trouble_biometric_thresholds.sql`) |
| ONNX face embeddings | **Done** | ArcFace ONNX default; correlation fallback |
| Credential lifecycle / SDK / receipts | **Not in scope** | Next investment area |

**Ansem-style read:** You are through Tier 1. Do not pivot. Do not add biometric features. Move to reusable verification, policy-based trust, and cross-partner credential reuse.

---

## Completed Tier 1 checklist

### 1. Merge PR #84 (v3 engine)
- Engine version `abraxas-biometric-v3`
- Measurable signals: blur, lighting, occlusion, alignment, screen replay, deepfake hook
- Stable `reason_codes` on reject and in persisted assessments
- Partner threshold merge from `partner_policies.rules_json.biometric_thresholds`

### 2. Wire Passport → Policy → Capture
**Before:** Passport → Capture → generic thresholds  
**After:** Partner Request → Policy → Capture → Decision

Client (`/passport?verify_request=…&policy_id=…&partner_id=…`):
- `app/passport/page.tsx` passes `capturePolicy` into `PassportDashboard`
- `AbraxasIdentityCapture` appends `verification_request_id`, `policy_id`, `partner_id` to FormData

Server (`POST /api/identity/documents/capture`):
- `resolveCaptureBiometricPolicy()` loads policy from verification request or direct `policy_id`
- `analyzeBiometricCapture()` applies partner thresholds at decision time

### 3. Admin v3 signal panel
`/admin/identity` reviewers now see:
- Face quality (blur, lighting, occlusion)
- Alignment, face coverage
- Screen replay, deepfake score/status
- `reason_codes`, threshold source, partner id
- Face match method (`onnx_embedding` vs `correlation`)

### 4. Partner policy seeds — Good Trouble
Migration `050_good_trouble_biometric_thresholds.sql`:

| Rule | Value |
|------|-------|
| Minimum face match | 0.90 |
| Minimum liveness | 0.92 |
| Maximum fraud risk | 0.15 |
| Age requirement | 21+ (`retail_minimum_age`) |

Constants mirrored in `lib/goodTrouble/biometricPolicy.ts`.

### 5. ONNX embedding face matcher
- **Default:** `ABRAXAS_FACE_MATCH_PROVIDER=onnx_embedding` (or unset)
- **Model:** `models/mobilefacenet.onnx` (ArcFace 112×112 → 512-d)
- **Download:** `bash scripts/download-face-embedding-model.sh`
- **Fallback:** correlation if model missing or inference fails
- **Override:** `ABRAXAS_FACE_MATCH_PROVIDER=correlation` for legacy behavior

Signal `face_match_method` stored on every assessment for reviewer transparency.

---

## What is production-complete vs engine-complete

| Concern | Engine complete | Production complete |
|---------|-----------------|---------------------|
| Biometric scoring | Yes | Yes (human review default) |
| Partner-specific thresholds | Yes | Yes (policy JSON + Good Trouble seed) |
| Reviewer explainability | Yes | Yes (admin panel) |
| Auto-approve | Supported | **Disabled** — tune from real captures first |
| ONNX on Vercel | Implemented | Requires model artifact on deploy host (~131 MB) |
| Mainnet on-chain | N/A | Not deployed |

---

## Freeze line — no new biometric features

After this audit, **do not** propose:
- New liveness modalities
- Vendor parity features (Veriff-style expansion)
- Additional signal types unless fixing a production bug

**Do** invest in:
1. Credential lifecycle (issuance, expiration, revocation)
2. Verification receipts and `abraxas.can()` SDK
3. Good Trouble end-to-end integration
4. Cross-partner credential reuse

---

## Env reference (biometric)

```env
# Face match — ONNX default; correlation fallback automatic
ABRAXAS_FACE_MATCH_PROVIDER=onnx_embedding
ABRAXAS_FACE_EMBEDDING_MODEL=/path/to/mobilefacenet.onnx

# Human review only for pilot
# Do NOT set ABRAXAS_BIOMETRIC_AUTO_APPROVE=1 until 50+ reviewed captures
```

---

## Confidence

With all five Tier 1 items complete, the biometric engine is **effectively complete for Verification v1**. Long-term moat is policy-based reusable trust — not out-building dedicated biometric vendors.
